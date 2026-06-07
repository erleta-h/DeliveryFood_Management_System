using FoodDelivery.Application.Drivers;
using FoodDelivery.Application.Notifications;
using FoodDelivery.Application.Partners;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Auth;
using FoodDelivery.Infrastructure.Data;
using FoodDelivery.Infrastructure.Drivers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;

namespace FoodDelivery.Infrastructure.Partners;

public sealed class DriverApplicationService : IDriverApplicationService
{
    private static readonly string[] AdminNotifyRoles = ["Admin", "Support"];
    private static readonly DriverApplicationDocumentKind[] RequiredDocumentKinds =
    [
        DriverApplicationDocumentKind.Identity,
        DriverApplicationDocumentKind.License,
        DriverApplicationDocumentKind.VehiclePhoto,
    ];

    private readonly IUnitOfWork _uow;
    private readonly INotificationPublisher _notifications;
    private readonly IHostEnvironment _env;

    public DriverApplicationService(
        IUnitOfWork uow,
        INotificationPublisher notifications,
        IHostEnvironment env)
    {
        _uow = uow;
        _notifications = notifications;
        _env = env;
    }

    public async Task<string?> SubmitAsync(
        SubmitDriverApplicationRequest request,
        IReadOnlyList<DriverApplicationDocumentUpload>? documents = null,
        CancellationToken cancellationToken = default)
    {
        if (!PhoneValidation.TryNormalize(request.Phone, out var phoneNorm, out var phoneErr))
            return phoneErr;

        var email = request.Email.Trim();
        if (email.Length is < 5 or > 256 || email.Contains('@', StringComparison.Ordinal) is false)
            return "Jep një adresë email të vlefshme.";

        var first = request.FirstName.Trim();
        var last = request.LastName.Trim();
        if (first.Length is 0 or > 80 || last.Length is 0 or > 80)
            return "Plotëso emrin dhe mbiemrin.";

        var vehicle = request.VehicleType.Trim();
        if (vehicle.Length is 0 or > 64)
            return "Përshkruaj mjetin (p.sh. biçikletë, motor, veturë).";

        var emailNorm = email.ToLowerInvariant();
        if (await _uow.Repository<User, long>().Query.AnyAsync(u => u.Email.ToLower() == emailNorm, cancellationToken))
            return "Ky email është tashmë i regjistruar.";

        if (await _uow.Repository<DriverApplication, long>().Query.AnyAsync(
                a => a.Email.ToLower() == emailNorm
                     && a.Status != DriverApplicationStatuses.Rejected
                     && a.Status != DriverApplicationStatuses.Active,
                cancellationToken))
            return "Ke tashmë një aplikim aktiv me këtë email.";

        var plate = string.IsNullOrWhiteSpace(request.LicensePlate) ? null : request.LicensePlate.Trim();
        if (plate is { Length: > 32 })
            return "Targa është shumë e gjatë.";

        var docErr = ValidateDocuments(documents);
        if (docErr is not null)
            return docErr;

        var entity = new DriverApplication
        {
            CreatedAt = DateTime.UtcNow,
            FirstName = first,
            LastName = last,
            Phone = phoneNorm,
            Email = email,
            VehicleType = vehicle,
            LicensePlate = plate,
            Message = string.IsNullOrWhiteSpace(request.Message) ? null : request.Message.Trim(),
            Status = DriverApplicationStatuses.Pending,
        };

        _uow.Repository<DriverApplication, long>().Add(entity);
        await _uow.SaveChangesAsync(cancellationToken);

        var uploadErr = await SaveDocumentsAsync(entity.Id, documents!, cancellationToken);
        if (uploadErr is not null)
        {
            await RollbackApplicationAsync(entity.Id, cancellationToken);
            return uploadErr;
        }

        await TryWriteSubmittedAuditAsync(entity.Id, entity.CreatedAt, cancellationToken);

        try
        {
            await _notifications.NotifyUsersInRolesAsync(
                AdminNotifyRoles,
                "Aplikim i ri deliver",
                $"{first} {last} ({vehicle})",
                NotificationTypes.DriverApplication,
                cancellationToken);
        }
        catch
        {
            /* njoftimi nuk duhet të anulojë aplikimin */
        }

        return null;
    }

    private static string? ValidateDocuments(IReadOnlyList<DriverApplicationDocumentUpload>? documents)
    {
        if (documents is null || documents.Count != RequiredDocumentKinds.Length)
            return "Ngarko të tre dokumentet: letërnjoftimi, patenta dhe foto e mjetit.";

        var seen = new HashSet<DriverApplicationDocumentKind>();
        foreach (var doc in documents)
        {
            if (!seen.Add(doc.Kind))
                return "Çdo dokument mund të ngarkohet vetëm një herë.";

            var extErr = DriverApplicationFileHelper.ValidateExtension(doc.FileName);
            if (extErr is not null)
                return extErr;

            if (doc.SizeBytes <= 0 || doc.SizeBytes > DriverApplicationFileHelper.MaxFileBytes)
                return "Çdo dokument duhet të jetë maksimum 5 MB.";
        }

        foreach (var kind in RequiredDocumentKinds)
        {
            if (!seen.Contains(kind))
                return "Ngarko të tre dokumentet: letërnjoftimi, patenta dhe foto e mjetit.";
        }

        return null;
    }

    private async Task<string?> SaveDocumentsAsync(
        long applicationId,
        IReadOnlyList<DriverApplicationDocumentUpload> documents,
        CancellationToken cancellationToken)
    {
        var uploaderId = await (
            from ur in _uow.Repository<UserRole, long>().Query.AsNoTracking()
            join r in _uow.Repository<Role, long>().Query.AsNoTracking() on ur.RoleId equals r.Id
            where r.Name == DbSeeder.AdminRoleName
            select ur.UserId
        ).FirstOrDefaultAsync(cancellationToken);

        if (uploaderId == 0)
            return "Sistemi nuk është gati për ngarkimin e dokumenteve. Provoni më vonë.";

        var root = Path.GetFullPath(Path.Combine(_env.ContentRootPath, DriverApplicationFileHelper.RelativeRoot));
        Directory.CreateDirectory(root);

        foreach (var doc in documents)
        {
            await using var _ = doc.Content;
            var ext = Path.GetExtension(doc.FileName);
            if (string.IsNullOrEmpty(ext))
                ext = ".bin";

            var safeName = $"{applicationId}_{doc.Kind}_{Guid.NewGuid():N}{ext}";
            var fullPath = Path.Combine(root, safeName);
            long totalWritten = 0;

            try
            {
                await using (var fs = new FileStream(fullPath, FileMode.CreateNew, FileAccess.Write, FileShare.None))
                {
                    var buffer = new byte[81920];
                    int read;
                    while ((read = await doc.Content.ReadAsync(buffer.AsMemory(0, buffer.Length), cancellationToken)) > 0)
                    {
                        totalWritten += read;
                        if (totalWritten > DriverApplicationFileHelper.MaxFileBytes)
                        {
                            DriverApplicationFileHelper.TryDeletePhysical(fullPath);
                            return "Çdo dokument duhet të jetë maksimum 5 MB.";
                        }

                        await fs.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
                    }
                }
            }
            catch
            {
                DriverApplicationFileHelper.TryDeletePhysical(fullPath);
                return "Ngarkimi i dokumenteve dështoi. Provoni përsëri.";
            }

            if (totalWritten == 0)
            {
                DriverApplicationFileHelper.TryDeletePhysical(fullPath);
                return "Një nga dokumentet është bosh.";
            }

            var displayName = string.IsNullOrWhiteSpace(doc.FileName) ? safeName : doc.FileName.Trim();
            if (displayName.Length > 500)
                displayName = displayName[..500];

            var stored = new StoredFile
            {
                Entity = "DriverApplication",
                EntityId = DriverApplicationFileHelper.EntityId(applicationId, doc.Kind),
                Filename = displayName,
                FilePath = fullPath,
                FileSize = totalWritten,
                UploaderId = uploaderId,
                CreatedById = uploaderId,
                CreatedAt = DateTime.UtcNow,
            };
            _uow.Repository<StoredFile, long>().Add(stored);
        }

        await _uow.SaveChangesAsync(cancellationToken);
        return null;
    }

    private async Task TryWriteSubmittedAuditAsync(
        long applicationId,
        DateTime createdAt,
        CancellationToken cancellationToken)
    {
        try
        {
            DriverApplicationAuditWriter.Add(
                _uow,
                applicationId,
                DriverApplicationAuditEventTypes.ApplicationSubmitted,
                null,
                null,
                createdAt);
            await _uow.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            /* audit opsional nëse skema ende nuk është migruar */
        }
    }

    private async Task RollbackApplicationAsync(long applicationId, CancellationToken cancellationToken)
    {
        await DeleteApplicationFilesAsync(applicationId, cancellationToken);
        try
        {
            var audits = await _uow.Repository<DriverApplicationAudit, long>().Query
                .Where(a => a.DriverApplicationId == applicationId)
                .ToListAsync(cancellationToken);
            foreach (var a in audits)
                _uow.Repository<DriverApplicationAudit, long>().Remove(a);
        }
        catch
        {
            /* tabela mund të mungojë */
        }

        var app = await _uow.Repository<DriverApplication, long>().Query
            .FirstOrDefaultAsync(a => a.Id == applicationId, cancellationToken);
        if (app is not null)
            _uow.Repository<DriverApplication, long>().Remove(app);

        await _uow.SaveChangesAsync(cancellationToken);
    }

    private async Task DeleteApplicationFilesAsync(long applicationId, CancellationToken cancellationToken)
    {
        var prefix = $"{applicationId}:";
        var files = await _uow.Repository<StoredFile, long>().Query
            .Where(f => f.Entity == "DriverApplication" && f.EntityId.StartsWith(prefix))
            .ToListAsync(cancellationToken);

        foreach (var f in files)
        {
            DriverApplicationFileHelper.TryDeletePhysical(f.FilePath);
            _uow.Repository<StoredFile, long>().Remove(f);
        }
    }
}
