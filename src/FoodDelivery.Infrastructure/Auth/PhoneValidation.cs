namespace FoodDelivery.Infrastructure.Auth;

public static class PhoneValidation
{
    /// <summary>
    /// Pranon +, hapësira, vizat; kërkon të paktën 8 shifra; maks. 32 karaktere pas trim.
    /// </summary>
    public static bool TryNormalize(string? input, out string normalized, out string? errorMessage)
    {
        normalized = string.Empty;
        errorMessage = null;

        if (string.IsNullOrWhiteSpace(input))
        {
            errorMessage = "Plotëso numrin e telefonit.";
            return false;
        }

        var t = input.Trim();
        if (t.Length > 32)
        {
            errorMessage = "Numri i telefonit është shumë i gjatë (maks. 32 karaktere).";
            return false;
        }

        var digitCount = t.Count(char.IsDigit);
        if (digitCount < 8)
        {
            errorMessage = "Numri i telefonit duhet të ketë të paktën 8 shifra (p.sh. +383 44 123 456).";
            return false;
        }

        normalized = t;
        return true;
    }
}
