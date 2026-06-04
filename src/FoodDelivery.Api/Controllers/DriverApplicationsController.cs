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

        var err = await _svc.SubmitAsync(body, documents, cancellationToken);
        if (err is not null)
            return BadRequest(new { message = err });

        return NoContent();
    }

    private static DriverApplicationDocumentUpload ToUpload(
        IFormFile file,
        DriverApplicationDocumentKind kind) =>
        new(
            kind,
            file.OpenReadStream(),
            file.FileName,
            file.ContentType ?? "application/octet-stream",
            file.Length);

    private static Task<IReadOnlyList<DriverApplicationDocumentUpload>?> ReadDocumentsAsync(
        IFormCollection form,
        CancellationToken cancellationToken)
    {
        _ = cancellationToken;
        var identity = form.Files.GetFile("identityDocument");
        var license = form.Files.GetFile("licenseDocument");
        var vehicle = form.Files.GetFile("vehiclePhoto");
        if (identity is null || license is null || vehicle is null)
            return Task.FromResult<IReadOnlyList<DriverApplicationDocumentUpload>?>(null);

        IReadOnlyList<DriverApplicationDocumentUpload> list =
        [
            ToUpload(identity, DriverApplicationDocumentKind.Identity),
            ToUpload(license, DriverApplicationDocumentKind.License),
            ToUpload(vehicle, DriverApplicationDocumentKind.VehiclePhoto),
        ];
        return Task.FromResult<IReadOnlyList<DriverApplicationDocumentUpload>?>(list);
    }
}
