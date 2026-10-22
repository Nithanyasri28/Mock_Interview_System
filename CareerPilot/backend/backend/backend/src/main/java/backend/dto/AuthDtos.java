package backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;

/** Request/response shapes for registration, login and profile. Passwords are never returned. */
public final class AuthDtos {

    private AuthDtos() {}

    public record RegisterRequest(
            @NotBlank(message = "Name is required") @Size(min = 2, max = 100, message = "Name must be 2-100 characters") String name,
            @NotBlank(message = "Email is required") @Email(message = "Enter a valid email address") @Size(max = 150) String email,
            @NotBlank(message = "Password is required")
            @Size(min = 8, max = 100, message = "Password must be 8-100 characters")
            @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$", message = "Password must contain at least one letter and one number") String password) {
    }

    public record LoginRequest(
            @NotBlank(message = "Email is required") String email,
            @NotBlank(message = "Password is required") String password) {
    }

    public record UserResponse(Long id, String name, String email, String education,
                               String skills, String targetRole, Instant createdAt) {
    }

    public record RegisterResponse(String message, UserResponse user) {
    }

    public record AuthResponse(String token, UserResponse user) {
    }

    public record UpdateProfileRequest(
            @NotBlank(message = "Name is required") @Size(min = 2, max = 100, message = "Name must be 2-100 characters") String name,
            @NotBlank(message = "Email is required") @Email(message = "Enter a valid email address") @Size(max = 150) String email,
            @Size(max = 255, message = "Education is too long") String education,
            @Size(max = 1000, message = "Skills text is too long") String skills,
            @Size(max = 100, message = "Target role is too long") String targetRole) {
    }

    /** token is only set when the email changed (the old token's subject is no longer valid). */
    public record ProfileUpdateResponse(UserResponse user, String token) {
    }
}
