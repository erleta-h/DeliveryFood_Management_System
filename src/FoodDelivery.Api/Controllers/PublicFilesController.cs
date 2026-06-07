using FoodDelivery.Application.Restaurants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

/// Fotot publike të artikujve të menysë (vetëm skedarë të lidhur me <c>MenuItem.ImageFileId</c>)
[ApiController]
[Route("api/files")]
public sealed class PublicFilesController : ControllerBase
{
    private readonly IPublicMenuImageService _menuImages;

    public PublicFilesController(IPublicMenuImageService menuImages)
    {
        _menuImages = menuImages;
    }

    [HttpGet("public/{id:long}")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMenuImage(long id, CancellationToken cancellationToken)
    {
        var result = await _menuImages.GetMenuImageAsync(id, cancellationToken);
        if (result is null)
            return NotFound();

        var (path, filename) = result.Value;
        var contentType = GuessContentType(filename);
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
