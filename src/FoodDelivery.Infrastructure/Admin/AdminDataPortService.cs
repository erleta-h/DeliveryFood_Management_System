using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using ClosedXML.Excel;
using FoodDelivery.Application.Admin;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Admin;

public sealed class AdminDataPortService : IAdminDataPortService
{
    private const int MaxRows = 5000;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
    };

    private readonly IUnitOfWork _uow;
    private readonly IPasswordHasher<User> _passwordHasher;

    public AdminDataPortService(IUnitOfWork uow, IPasswordHasher<User> passwordHasher)
    {
        _uow = uow;
        _passwordHasher = passwordHasher;
    }

    public async Task<(byte[] bytes, string contentType, string fileName)> ExportAsync(
        string resource,
        string format,
        CancellationToken cancellationToken = default)
    {
        var r = resource.Trim().ToLowerInvariant();
        var f = format.Trim().ToLowerInvariant();
        if (f is not ("csv" or "json" or "xlsx"))
            throw new ArgumentException("Formati duhet të jetë csv, json ose xlsx.", nameof(format));

        return r switch
        {
            "orders" => await ExportOrdersAsync(f, cancellationToken),
            "restaurants" => await ExportRestaurantsAsync(f, cancellationToken),
            "customers" => await ExportCustomersAsync(f, cancellationToken),
            "coupons" => await ExportCouponsAsync(f, cancellationToken),
            "support-tickets" => await ExportSupportTicketsAsync(f, cancellationToken),
            _ => throw new ArgumentException("Burimi i panjohur.", nameof(resource)),
        };
    }

    public async Task<string?> ImportAsync(
        string resource,
        string format,
        Stream body,
        CancellationToken cancellationToken = default)
    {
        var r = resource.Trim().ToLowerInvariant();
        var f = format.Trim().ToLowerInvariant();
        using var reader = new StreamReader(body, Encoding.UTF8, leaveOpen: true);
        var text = await reader.ReadToEndAsync(cancellationToken).ConfigureAwait(false);
        if (f is "csv")
            text = NormalizeImportCsv(text);

        return r switch
        {
            "coupons" when f is "json" => await ImportCouponsJsonAsync(text, cancellationToken),
            "coupons" when f is "csv" => await ImportCouponsCsvAsync(text, cancellationToken),
            "cms" when f is "json" => await ImportCmsJsonAsync(text, cancellationToken),
            "restaurants" when f is "csv" => await ImportRestaurantsCsvAsync(text, cancellationToken),
            _ => "Burim/format i mbështetur: coupons+json, coupons+csv, cms+json, restaurants+csv.",
        };
    }

    private static string Stamp(string name, string ext) =>
        $"{name}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.{ext}";

    private static string CsvCell(string? s)
    {
        var t = s ?? string.Empty;
        return $"\"{t.Replace("\"", "\"\"", StringComparison.Ordinal)}\"";
    }

    private async Task<(byte[] bytes, string contentType, string fileName)> ExportOrdersAsync(
        string format,
        CancellationToken cancellationToken)
    {
        var rows = await _uow.Repository<Order, long>().Query.AsNoTracking()
            .OrderByDescending(o => o.PlacedAt)
            .Take(MaxRows)
            .Select(o => new
            {
                o.Id,
                o.OrderNumber,
                o.PlacedAt,
                o.Status,
                o.Total,
                Restaurant = o.Restaurant.Name,
                CustomerEmail = o.User.Email,
            })
            .ToListAsync(cancellationToken);

        if (format == "json")
        {
            var json = JsonSerializer.Serialize(rows, JsonOpts);
            return (Encoding.UTF8.GetBytes(json), "application/json; charset=utf-8", Stamp("orders", "json"));
        }

        if (format == "csv")
        {
            var sb = new StringBuilder();
            sb.AppendLine("id,orderNumber,placedAtUtc,status,total,restaurant,customerEmail");
            foreach (var x in rows)
            {
                sb.AppendLine(string.Join(',',
                    x.Id,
                    CsvCell(x.OrderNumber),
                    x.PlacedAt.ToString("o", CultureInfo.InvariantCulture),
                    x.Status,
                    x.Total.ToString(CultureInfo.InvariantCulture),
                    CsvCell(x.Restaurant),
                    CsvCell(x.CustomerEmail)));
            }

            return (Encoding.UTF8.GetBytes(sb.ToString()), "text/csv; charset=utf-8", Stamp("orders", "csv"));
        }

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Orders");
        ws.Cell(1, 1).Value = "Id";
        ws.Cell(1, 2).Value = "OrderNumber";
        ws.Cell(1, 3).Value = "PlacedAtUtc";
        ws.Cell(1, 4).Value = "Status";
        ws.Cell(1, 5).Value = "Total";
        ws.Cell(1, 6).Value = "Restaurant";
        ws.Cell(1, 7).Value = "CustomerEmail";
        var r = 2;
        foreach (var x in rows)
        {
            ws.Cell(r, 1).Value = x.Id;
            ws.Cell(r, 2).Value = x.OrderNumber;
            ws.Cell(r, 3).Value = x.PlacedAt;
            ws.Cell(r, 4).Value = x.Status;
            ws.Cell(r, 5).Value = x.Total;
            ws.Cell(r, 6).Value = x.Restaurant;
            ws.Cell(r, 7).Value = x.CustomerEmail;
            r++;
        }

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return (ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", Stamp("orders", "xlsx"));
    }

    private async Task<(byte[] bytes, string contentType, string fileName)> ExportRestaurantsAsync(
        string format,
        CancellationToken cancellationToken)
    {
        var rows = await _uow.Repository<Restaurant, long>().Query.AsNoTracking()
            .OrderBy(r => r.Name)
            .Take(MaxRows)
            .Select(r => new
            {
                r.Id,
                r.Name,
                r.Slug,
                r.City,
                r.IsActive,
                r.IsApproved,
                r.DeliveryFee,
                Orders = r.Orders.Count,
            })
            .ToListAsync(cancellationToken);

        if (format == "json")
            return (Encoding.UTF8.GetBytes(JsonSerializer.Serialize(rows, JsonOpts)), "application/json; charset=utf-8",
                Stamp("restaurants", "json"));

        if (format == "csv")
        {
            var sb = new StringBuilder();
            sb.AppendLine("id,name,slug,city,isActive,isApproved,deliveryFee,orderCount");
            foreach (var x in rows)
            {
                sb.AppendLine(string.Join(',',
                    x.Id,
                    CsvCell(x.Name),
                    CsvCell(x.Slug),
                    CsvCell(x.City),
                    x.IsActive ? 1 : 0,
                    x.IsApproved ? 1 : 0,
                    x.DeliveryFee.ToString(CultureInfo.InvariantCulture),
                    x.Orders));
            }

            return (Encoding.UTF8.GetBytes(sb.ToString()), "text/csv; charset=utf-8", Stamp("restaurants", "csv"));
        }

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Restaurants");
        ws.Cell(1, 1).Value = "Id";
        ws.Cell(1, 2).Value = "Name";
        ws.Cell(1, 3).Value = "Slug";
        ws.Cell(1, 4).Value = "City";
        ws.Cell(1, 5).Value = "Active";
        ws.Cell(1, 6).Value = "Approved";
        ws.Cell(1, 7).Value = "DeliveryFee";
        ws.Cell(1, 8).Value = "OrderCount";
        var r = 2;
        foreach (var x in rows)
        {
            ws.Cell(r, 1).Value = x.Id;
            ws.Cell(r, 2).Value = x.Name;
            ws.Cell(r, 3).Value = x.Slug;
            ws.Cell(r, 4).Value = x.City;
            ws.Cell(r, 5).Value = x.IsActive;
            ws.Cell(r, 6).Value = x.IsApproved;
            ws.Cell(r, 7).Value = x.DeliveryFee;
            ws.Cell(r, 8).Value = x.Orders;
            r++;
        }

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return (ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            Stamp("restaurants", "xlsx"));
    }

    private async Task<(byte[] bytes, string contentType, string fileName)> ExportCustomersAsync(
        string format,
        CancellationToken cancellationToken)
    {
        var customerRoleId = await _uow.Repository<Role, long>().Query.AsNoTracking()
            .Where(r => r.Name == DbSeeder.CustomerRoleName)
            .Select(r => r.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var rows = await _uow.Repository<User, long>().Query.AsNoTracking()
            .Where(u => u.UserRoles.Any(ur => ur.RoleId == customerRoleId))
            .OrderBy(u => u.Email)
            .Take(MaxRows)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.FirstName,
                u.LastName,
                u.Phone,
                u.IsActive,
                u.CreatedAt,
                OrderCount = u.Orders.Count,
            })
            .ToListAsync(cancellationToken);

        if (format == "json")
            return (Encoding.UTF8.GetBytes(JsonSerializer.Serialize(rows, JsonOpts)), "application/json; charset=utf-8",
                Stamp("customers", "json"));

        if (format == "csv")
        {
            var sb = new StringBuilder();
            sb.AppendLine("id,email,firstName,lastName,phone,isActive,createdAtUtc,orderCount");
            foreach (var x in rows)
            {
                sb.AppendLine(string.Join(',',
                    x.Id,
                    CsvCell(x.Email),
                    CsvCell(x.FirstName),
                    CsvCell(x.LastName),
                    CsvCell(x.Phone),
                    x.IsActive ? 1 : 0,
                    x.CreatedAt.ToString("o", CultureInfo.InvariantCulture),
                    x.OrderCount));
            }

            return (Encoding.UTF8.GetBytes(sb.ToString()), "text/csv; charset=utf-8", Stamp("customers", "csv"));
        }

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Customers");
        string[] h =
        {
            "Id", "Email", "FirstName", "LastName", "Phone", "Active", "CreatedAtUtc", "OrderCount",
        };
        for (var i = 0; i < h.Length; i++)
            ws.Cell(1, i + 1).Value = h[i];
        var r = 2;
        foreach (var x in rows)
        {
            ws.Cell(r, 1).Value = x.Id;
            ws.Cell(r, 2).Value = x.Email;
            ws.Cell(r, 3).Value = x.FirstName;
            ws.Cell(r, 4).Value = x.LastName;
            ws.Cell(r, 5).Value = x.Phone ?? string.Empty;
            ws.Cell(r, 6).Value = x.IsActive;
            ws.Cell(r, 7).Value = x.CreatedAt;
            ws.Cell(r, 8).Value = x.OrderCount;
            r++;
        }

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return (ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            Stamp("customers", "xlsx"));
    }

    private async Task<(byte[] bytes, string contentType, string fileName)> ExportCouponsAsync(
        string format,
        CancellationToken cancellationToken)
    {
        var rows = await _uow.Repository<Coupon, long>().Query.AsNoTracking()
            .OrderByDescending(c => c.CreatedAt)
            .Take(MaxRows)
            .Select(c => new
            {
                c.Id,
                c.Code,
                c.DiscountPercent,
                c.MaxDiscountAmount,
                c.MinOrderAmount,
                c.IsActive,
                c.UsesCount,
                c.MaxUses,
                c.ValidFrom,
                c.ValidTo,
                c.CreatedAt,
            })
            .ToListAsync(cancellationToken);

        if (format == "json")
            return (Encoding.UTF8.GetBytes(JsonSerializer.Serialize(rows, JsonOpts)), "application/json; charset=utf-8",
                Stamp("coupons", "json"));

        if (format == "csv")
        {
            var sb = new StringBuilder();
            sb.AppendLine("id,code,discountPercent,maxDiscountAmount,minOrderAmount,isActive,usesCount,maxUses,validFromUtc,validToUtc,createdAtUtc");
            foreach (var x in rows)
            {
                sb.AppendLine(string.Join(',',
                    x.Id,
                    CsvCell(x.Code),
                    x.DiscountPercent,
                    x.MaxDiscountAmount?.ToString(CultureInfo.InvariantCulture) ?? string.Empty,
                    x.MinOrderAmount?.ToString(CultureInfo.InvariantCulture) ?? string.Empty,
                    x.IsActive ? 1 : 0,
                    x.UsesCount,
                    x.MaxUses?.ToString(CultureInfo.InvariantCulture) ?? string.Empty,
                    x.ValidFrom?.ToString("o", CultureInfo.InvariantCulture) ?? string.Empty,
                    x.ValidTo?.ToString("o", CultureInfo.InvariantCulture) ?? string.Empty,
                    x.CreatedAt.ToString("o", CultureInfo.InvariantCulture)));
            }

            return (Encoding.UTF8.GetBytes(sb.ToString()), "text/csv; charset=utf-8", Stamp("coupons", "csv"));
        }

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Coupons");
        ws.Cell(1, 1).Value = "Id";
        ws.Cell(1, 2).Value = "Code";
        ws.Cell(1, 3).Value = "DiscountPercent";
        ws.Cell(1, 4).Value = "Active";
        ws.Cell(1, 5).Value = "Uses";
        ws.Cell(1, 6).Value = "MaxUses";
        ws.Cell(1, 7).Value = "CreatedAt";
        var r = 2;
        foreach (var x in rows)
        {
            ws.Cell(r, 1).Value = x.Id;
            ws.Cell(r, 2).Value = x.Code;
            ws.Cell(r, 3).Value = x.DiscountPercent;
            ws.Cell(r, 4).Value = x.IsActive;
            ws.Cell(r, 5).Value = x.UsesCount;
            ws.Cell(r, 6).Value = x.MaxUses ?? 0;
            ws.Cell(r, 7).Value = x.CreatedAt;
            r++;
        }

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return (ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            Stamp("coupons", "xlsx"));
    }

    private async Task<(byte[] bytes, string contentType, string fileName)> ExportSupportTicketsAsync(
        string format,
        CancellationToken cancellationToken)
    {
        var rows = await _uow.Repository<SupportTicket, long>().Query.AsNoTracking()
            .OrderByDescending(t => t.CreatedAt)
            .Take(MaxRows)
            .Select(t => new
            {
                t.Id,
                t.UserId,
                UserEmail = t.User.Email,
                t.Subject,
                t.Status,
                t.CreatedAt,
            })
            .ToListAsync(cancellationToken);

        if (format == "json")
            return (Encoding.UTF8.GetBytes(JsonSerializer.Serialize(rows, JsonOpts)), "application/json; charset=utf-8",
                Stamp("support_tickets", "json"));

        if (format == "csv")
        {
            var sb = new StringBuilder();
            sb.AppendLine("id,userId,userEmail,subject,status,createdAtUtc");
            foreach (var x in rows)
            {
                sb.AppendLine(string.Join(',',
                    x.Id,
                    x.UserId,
                    CsvCell(x.UserEmail),
                    CsvCell(x.Subject),
                    x.Status,
                    x.CreatedAt.ToString("o", CultureInfo.InvariantCulture)));
            }

            return (Encoding.UTF8.GetBytes(sb.ToString()), "text/csv; charset=utf-8", Stamp("support_tickets", "csv"));
        }

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Tickets");
        ws.Cell(1, 1).Value = "Id";
        ws.Cell(1, 2).Value = "UserId";
        ws.Cell(1, 3).Value = "Email";
        ws.Cell(1, 4).Value = "Subject";
        ws.Cell(1, 5).Value = "Status";
        ws.Cell(1, 6).Value = "CreatedAt";
        var r = 2;
        foreach (var x in rows)
        {
            ws.Cell(r, 1).Value = x.Id;
            ws.Cell(r, 2).Value = x.UserId;
            ws.Cell(r, 3).Value = x.UserEmail;
            ws.Cell(r, 4).Value = x.Subject;
            ws.Cell(r, 5).Value = x.Status;
            ws.Cell(r, 6).Value = x.CreatedAt;
            r++;
        }

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return (ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            Stamp("support_tickets", "xlsx"));
    }

    private sealed class CouponImportDto
    {
        public string? Code { get; set; }
        public int DiscountPercent { get; set; }
        public decimal? MaxDiscountAmount { get; set; }
        public decimal? MinOrderAmount { get; set; }
    }

    private async Task<string?> ImportCouponsJsonAsync(string json, CancellationToken cancellationToken)
    {
        List<CouponImportDto>? list;
        try
        {
            list = JsonSerializer.Deserialize<List<CouponImportDto>>(json, JsonOpts);
        }
        catch
        {
            return "JSON i pavlefshëm.";
        }

        if (list is null || list.Count == 0)
            return "Lista është bosh.";

        var now = DateTime.UtcNow;
        var n = 0;
        foreach (var row in list.Take(200))
        {
            var code = row.Code?.Trim().ToUpperInvariant();
            if (string.IsNullOrEmpty(code) || row.DiscountPercent is <= 0 or > 100)
                continue;
            if (await _uow.Repository<Coupon, long>().Query.AnyAsync(c => c.Code == code, cancellationToken))
                continue;
            _uow.Repository<Coupon, long>().Add(new Coupon
            {
                Code = code,
                DiscountPercent = row.DiscountPercent,
                MaxDiscountAmount = row.MaxDiscountAmount,
                MinOrderAmount = row.MinOrderAmount,
                IsActive = true,
                UsesCount = 0,
                CreatedAt = now,
            });
            n++;
        }

        if (n == 0)
            return "Asnjë rresht i vlefshëm (kod unik, zbritje 1–100).";
        await _uow.SaveChangesAsync(cancellationToken);
        return null;
    }

    private async Task<string?> ImportCouponsCsvAsync(string csv, CancellationToken cancellationToken)
    {
        var lines = csv.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (lines.Length < 2)
            return "CSV: të paktën header + një rresht.";

        var now = DateTime.UtcNow;
        var n = 0;
        for (var i = 1; i < lines.Length && n < 200; i++)
        {
            var parts = SplitCsvLine(lines[i]);
            if (parts.Count < 2)
                continue;
            var code = parts[0].Trim().ToUpperInvariant();
            if (!int.TryParse(parts[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out var pct) ||
                pct is <= 0 or > 100)
                continue;
            if (await _uow.Repository<Coupon, long>().Query.AnyAsync(c => c.Code == code, cancellationToken))
                continue;

            decimal? maxDisc = null;
            if (parts.Count > 2 && decimal.TryParse(parts[2], NumberStyles.Number, CultureInfo.InvariantCulture, out var md))
                maxDisc = md;
            decimal? minOrder = null;
            if (parts.Count > 3 && decimal.TryParse(parts[3], NumberStyles.Number, CultureInfo.InvariantCulture, out var mo))
                minOrder = mo;

            _uow.Repository<Coupon, long>().Add(new Coupon
            {
                Code = code,
                DiscountPercent = pct,
                MaxDiscountAmount = maxDisc,
                MinOrderAmount = minOrder,
                IsActive = true,
                UsesCount = 0,
                CreatedAt = now,
            });
            n++;
        }

        if (n == 0)
            return "Asnjë rresht i vlefshëm (Code,DiscountPercent).";
        await _uow.SaveChangesAsync(cancellationToken);
        return null;
    }

    private static string NormalizeImportCsv(string csv)
    {
        if (string.IsNullOrEmpty(csv))
            return csv;
        if (csv[0] == '\uFEFF')
            csv = csv[1..];
        return csv.Replace("\r\n", "\n", StringComparison.Ordinal).Replace('\r', '\n');
    }

    private static List<string> SplitCsvLine(string line)
    {
        var r = new List<string>();
        var cur = new StringBuilder();
        var inQ = false;
        for (var i = 0; i < line.Length; i++)
        {
            var c = line[i];
            if (c == '"')
            {
                if (inQ && i + 1 < line.Length && line[i + 1] == '"')
                {
                    cur.Append('"');
                    i++;
                }
                else
                    inQ = !inQ;
            }
            else if (c == ',' && !inQ)
            {
                r.Add(cur.ToString());
                cur.Clear();
            }
            else
                cur.Append(c);
        }

        r.Add(cur.ToString());
        return r;
    }

    private async Task<string?> ImportCmsJsonAsync(string json, CancellationToken cancellationToken)
    {
        Dictionary<string, string>? map;
        try
        {
            map = JsonSerializer.Deserialize<Dictionary<string, string>>(json, JsonOpts);
        }
        catch
        {
            return "JSON i pavlefshëm (pritet objekt çelës → vlerë).";
        }

        if (map is null || map.Count == 0)
            return "Objekti është bosh.";

        var now = DateTime.UtcNow;
        var n = 0;
        foreach (var (k, v) in map)
        {
            var key = k.Trim();
            if (!key.StartsWith("cms.", StringComparison.Ordinal))
                continue;
            var existing = await _uow.Repository<Setting, long>().Query.FirstOrDefaultAsync(s => s.Key == key, cancellationToken);
            if (existing is null)
            {
                _uow.Repository<Setting, long>().Add(new Setting
                {
                    Key = key,
                    Value = v,
                    CreatedAt = now,
                });
            }
            else
            {
                existing.Value = v;
                existing.UpdatedAt = now;
            }

            n++;
        }

        if (n == 0)
            return "Asnjë çelës që fillon me cms.";
        await _uow.SaveChangesAsync(cancellationToken);
        return null;
    }

    private async Task<string?> ImportRestaurantsCsvAsync(string csv, CancellationToken cancellationToken)
    {
        var lines = csv.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (lines.Length < 2)
            return "CSV: të paktën header + një rresht.";

        var columns = MapRestaurantImportColumns(SplitCsvLine(lines[0]));
        if (columns.NameIndex < 0)
            return "CSV: kolona Name është e detyrueshme (Name,Email,Phone,City,Address).";

        var categoryId = await _uow.Repository<FoodCategory, long>().Query
            .OrderBy(c => c.SortOrder)
            .Select(c => (long?)c.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (categoryId is null)
            return "Nuk ka kategori ushqimi në bazë. Shto së paku një kategori.";

        Role? staffRole = null;
        var now = DateTime.UtcNow;
        var created = 0;

        for (var i = 1; i < lines.Length && created < MaxRows; i++)
        {
            var parts = SplitCsvLine(lines[i]);
            var name = GetCsvField(parts, columns.NameIndex)?.Trim();
            if (string.IsNullOrWhiteSpace(name))
                continue;

            var email = GetCsvField(parts, columns.EmailIndex)?.Trim();
            var phone = GetCsvField(parts, columns.PhoneIndex)?.Trim();
            var city = GetCsvField(parts, columns.CityIndex)?.Trim();
            var address = GetCsvField(parts, columns.AddressIndex)?.Trim();

            var slug = await EnsureUniqueRestaurantSlugAsync(ToSlug(name), cancellationToken);
            var restaurant = new Restaurant
            {
                Name = name,
                Slug = slug,
                AddressLine = string.IsNullOrWhiteSpace(address) ? null : address,
                City = string.IsNullOrWhiteSpace(city) ? null : city,
                Phone = string.IsNullOrWhiteSpace(phone) ? null : phone,
                FoodCategoryId = categoryId.Value,
                DeliveryFee = 1.50m,
                AverageRating = 0,
                ReviewCount = 0,
                MinOrderAmount = 3m,
                EstimatedDeliveryMinutes = 35,
                IsApproved = true,
                IsActive = true,
                CreatedAt = now,
                Description = $"Import: {name}.",
            };
            _uow.Repository<Restaurant, long>().Add(restaurant);

            if (!string.IsNullOrWhiteSpace(email))
            {
                staffRole ??= await _uow.Repository<Role, long>().Query.AsNoTracking()
                    .FirstOrDefaultAsync(r => r.Name == DbSeeder.RestaurantStaffRoleName, cancellationToken);
                if (staffRole is null)
                    return $"Roli {DbSeeder.RestaurantStaffRoleName} mungon në bazë.";

                var normalizedEmail = email.ToLowerInvariant();
                var userExists = await _uow.Repository<User, long>().Query
                    .AnyAsync(u => u.Email == normalizedEmail, cancellationToken);
                if (!userExists)
                {
                    var (first, last) = SplitNameForUser(name);
                    var user = new User
                    {
                        Email = normalizedEmail,
                        FirstName = first,
                        LastName = last,
                        Phone = string.IsNullOrWhiteSpace(phone) ? null : phone,
                        IsActive = true,
                        MustChangePassword = true,
                        CreatedAt = now,
                        PasswordHash = string.Empty,
                    };
                    user.PasswordHash = _passwordHasher.HashPassword(user, GenerateTempPassword());
                    _uow.Repository<User, long>().Add(user);
                    _uow.Repository<UserRole, long>().Add(new UserRole
                    {
                        User = user,
                        RoleId = staffRole.Id,
                        AssignedAt = now,
                        CreatedAt = now,
                    });
                    _uow.Repository<RestaurantStaff, long>().Add(new RestaurantStaff
                    {
                        User = user,
                        Restaurant = restaurant,
                        Title = "Administrator restoranti",
                        CreatedAt = now,
                    });
                }
            }

            created++;
        }

        if (created == 0)
            return "Asnjë rresht i vlefshëm (Name i detyrueshëm).";
        await _uow.SaveChangesAsync(cancellationToken);
        return null;
    }

    private sealed record RestaurantImportColumns(
        int NameIndex,
        int EmailIndex,
        int PhoneIndex,
        int CityIndex,
        int AddressIndex);

    private static RestaurantImportColumns MapRestaurantImportColumns(IReadOnlyList<string> headers)
    {
        static int Idx(IReadOnlyList<string> h, params string[] names)
        {
            for (var i = 0; i < h.Count; i++)
            {
                var cell = h[i].Trim().TrimStart('\uFEFF');
                foreach (var n in names)
                {
                    if (cell.Equals(n, StringComparison.OrdinalIgnoreCase))
                        return i;
                }
            }

            return -1;
        }

        return new RestaurantImportColumns(
            Idx(headers, "Name"),
            Idx(headers, "Email"),
            Idx(headers, "Phone"),
            Idx(headers, "City"),
            Idx(headers, "Address", "AddressLine"));
    }

    private static string? GetCsvField(IReadOnlyList<string> parts, int index) =>
        index >= 0 && index < parts.Count ? parts[index] : null;

    private static (string First, string Last) SplitNameForUser(string name)
    {
        var t = name.Trim();
        var sp = t.IndexOf(' ');
        if (sp <= 0)
            return (t, string.Empty);
        return (t[..sp].Trim(), t[(sp + 1)..].Trim());
    }

    private async Task<string> EnsureUniqueRestaurantSlugAsync(string baseSlug, CancellationToken cancellationToken)
    {
        var slug = baseSlug;
        var n = 0;
        while (await _uow.Repository<Restaurant, long>().Query.AnyAsync(r => r.Slug == slug, cancellationToken))
        {
            n++;
            slug = $"{baseSlug}-{n}";
            if (n > 200)
                throw new InvalidOperationException("Nuk u gjet slug unik.");
        }

        return slug;
    }

    private static string ToSlug(string venueName)
    {
        var lower = venueName.Trim().ToLowerInvariant();
        var sb = new StringBuilder();
        foreach (var c in lower)
        {
            if (char.IsLetterOrDigit(c))
                sb.Append(c);
            else if (c is ' ' or '-' or '_')
                sb.Append('-');
        }

        var s = sb.ToString().Trim('-');
        while (s.Contains("--", StringComparison.Ordinal))
            s = s.Replace("--", "-", StringComparison.Ordinal);
        if (s.Length == 0)
            s = $"restaurant-{Guid.NewGuid():N}"[..12];
        return s.Length <= 400 ? s : s[..400].TrimEnd('-');
    }

    private static string GenerateTempPassword()
    {
        Span<byte> buf = stackalloc byte[8];
        RandomNumberGenerator.Fill(buf);
        var part = Convert.ToHexString(buf)[..10];
        return $"Fd{part}a!";
    }
}
