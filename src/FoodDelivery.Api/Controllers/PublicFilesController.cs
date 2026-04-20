using FoodDelivery.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Api.Controllers;

/// Fotot publike të artikujve të menysë (vetëm skedarë të lidhur me <c>MenuItem.ImageFileId</c>)
[ApiController]
[Route("api/files")]
public sealed class PublicFilesController : ControllerBase
{
    private readonly FoodDeliveryDbContext _db;

    public PublicFilesController(FoodDeliveryDbContext db)
    {
        _db = db;
    }

    [HttpGet("public/{id:long}")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMenuImage(long id, CancellationToken cancellationToken)
    {
        var usedByMenu = await _db.MenuItems.AsNoTracking()
            .AnyAsync(m => m.ImageFileId == id, cancellationToken);
        if (!usedByMenu)
            return NotFound();

        var file = await _db.StoredFiles.AsNoTracking() 
            .FirstOrDefaultAsync(f => f.Id == id, cancellationToken);
        if (file is null || string.IsNullOrWhiteSpace(file.FilePath))
            return NotFound();

        var path = file.FilePath;
        if (!System.IO.File.Exists(path))
            return NotFound();

        var contentType = GuessContentType(file.Filename);
        return PhysicalFile(path, contentType);
    }

    private static string GuessContentType(string filename)
    {
        var ext = Path.GetExtension(filename).ToLowerInvariant();
        return ext switch
        {
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".webp" => "image/webp",
            ".gif" => "image/gif",
            ".svg" => "image/svg+xml",
            _ => "application/octet-stream",
        };
    }
}
