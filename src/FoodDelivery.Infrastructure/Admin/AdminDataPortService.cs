using System.Globalization;
using System.Text;
using System.Text.Json;
using ClosedXML.Excel;
using FoodDelivery.Application.Admin;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Data;
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

    public AdminDataPortService(IUnitOfWork uow) => _uow = uow;

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

        return r switch
        {
            "coupons" when f is "json" => await ImportCouponsJsonAsync(text, cancellationToken),
            "coupons" when f is "csv" => await ImportCouponsCsvAsync(text, cancellationToken),
            "cms" when f is "json" => await ImportCmsJsonAsync(text, cancellationToken),
            _ => "Burim/format i mbështetur: coupons+json, coupons+csv, cms+json.",
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
                c.IsActive,
                c.UsesCount,
                c.MaxUses,
                c.CreatedAt,
            })
            .ToListAsync(cancellationToken);

        if (format == "json")
            return (Encoding.UTF8.GetBytes(JsonSerializer.Serialize(rows, JsonOpts)), "application/json; charset=utf-8",
                Stamp("coupons", "json"));

        if (format == "csv")
        {
            var sb = new StringBuilder();
            sb.AppendLine("id,code,discountPercent,isActive,usesCount,maxUses,createdAtUtc");
            foreach (var x in rows)
            {
                sb.AppendLine(string.Join(',',
                    x.Id,
                    CsvCell(x.Code),
                    x.DiscountPercent,
                    x.IsActive ? 1 : 0,
                    x.UsesCount,
                    x.MaxUses?.ToString(CultureInfo.InvariantCulture) ?? string.Empty,
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
            _uow.Repository<Coupon, long>().Add(new Coupon
            {
                Code = code,
                DiscountPercent = pct,
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
}
