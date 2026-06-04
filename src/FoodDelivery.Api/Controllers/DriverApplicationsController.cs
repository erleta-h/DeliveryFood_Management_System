using FoodDelivery.Application.Drivers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.Api.Controllers;

[ApiController]
[Route("api/driver")]
public sealed class DriverApplicationsController : ControllerBase
{
    private readonly IDriverApplicationService _svc;

    public DriverApplicationsController(IDriverApplicationService svc)
    {
        _svc = svc;
    }

    [HttpPost("applications")]
    [AllowAnonymous]
    [RequestSizeLimit(20_971_520)]
    [RequestFormLimits(MultipartBodyLengthLimit = 20_971_520)]
    [Consumes("multipart/form-data", "application/json")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Submit(CancellationToken cancellationToken)
    {
        SubmitDriverApplicationRequest body;
        IReadOnlyList<DriverApplicationDocumentUpload>? documents = null;

        if (Request.HasFormContentType)
        {
            var form = Request.Form;
            body = new SubmitDriverApplicationRequest(
                form["firstName"].ToString(),
                form["lastName"].ToString(),
                form["phone"].ToString(),
                form["email"].ToString(),
                form["vehicleType"].ToString(),
                string.IsNullOrWhiteSpace(form["licensePlate"]) ? null : form["licensePlate"].ToString(),
                string.IsNullOrWhiteSpace(form["message"]) ? null : form["message"].ToString());

            documents = await ReadDocumentsAsync(form, cancellationToken);
            if (documents is null)
                return BadRequest(new { message = "Ngarko të tre dokumentet: letërnjoftimi, patenta dhe foto e mjetit." });
        }
        else
        {
            var json = await Request.ReadFromJsonAsync<SubmitDriverApplicationRequest>(cancellationToken);
            if (json is null)
                return BadRequest(new { message = "Të dhënat e aplikimit mungojnë." });
            body = json;
            return BadRequest(new { message = "Ngarko të tre dokumentet: letërnjoftimi, patenta dhe foto e mjetit." });
        }

        try
        {
            var err = await _svc.SubmitAsync(body, documents, cancellationToken);
            if (err is not null)
                return BadRequest(new { message = err });

            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Aplikimi dështoi në server. Rinis API-n pas migrimit të bazës, pastaj provo përsëri.",
                detail = ex.Message,
            });
        }
    }

    private static async Task<DriverApplicationDocumentUpload> ToUploadAsync(
        IFormFile file,
        DriverApplicationDocumentKind kind,
        CancellationToken cancellationToken)
    {
        var ms = new MemoryStream();
        await file.CopyToAsync(ms, cancellationToken);
        ms.Position = 0;
        return new DriverApplicationDocumentUpload(
            kind,
            ms,
            file.FileName,
            file.ContentType ?? "application/octet-stream",
            file.Length);
    }

    private static async Task<IReadOnlyList<DriverApplicationDocumentUpload>?> ReadDocumentsAsync(
        IFormCollection form,
        CancellationToken cancellationToken)
    {
        var identity = form.Files.GetFile("identityDocument");
        var license = form.Files.GetFile("licenseDocument");
        var vehicle = form.Files.GetFile("vehiclePhoto");
        if (identity is null || license is null || vehicle is null)
            return null;

        return
        [
            await ToUploadAsync(identity, DriverApplicationDocumentKind.Identity, cancellationToken),
            await ToUploadAsync(license, DriverApplicationDocumentKind.License, cancellationToken),
            await ToUploadAsync(vehicle, DriverApplicationDocumentKind.VehiclePhoto, cancellationToken),
        ];
    }
}
