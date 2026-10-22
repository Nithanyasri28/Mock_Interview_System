package backend.service;

import backend.dto.AuthDtos.RegisterRequest;
import backend.dto.AuthDtos.UpdateProfileRequest;
import backend.dto.AuthDtos.UserResponse;
import backend.entity.User;
import backend.exception.ApiException;
import backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public User register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists.");
        }
        User user = new User();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.password()));
        return userRepository.save(user);
    }

    public User authenticate(String email, String password) {
        User user = userRepository.findByEmailIgnoreCase(email.trim()).orElse(null);
        if (user == null || user.getPassword() == null || !passwordEncoder.matches(password, user.getPassword())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password.");
        }
        return user;
    }

    /** Loads the logged-in user from the JWT subject, or fails with 401. */
    public User requireByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(email).orElseThrow(() ->
                new ApiException(HttpStatus.UNAUTHORIZED, "Your session is no longer valid. Please log in again."));
    }

    @Transactional
    public User updateProfile(User user, UpdateProfileRequest request) {
        String newEmail = request.email().trim().toLowerCase(Locale.ROOT);
        if (!newEmail.equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmailIgnoreCase(newEmail)) {
            throw new ApiException(HttpStatus.CONFLICT, "That email is already used by another account.");
        }
        user.setName(request.name().trim());
        user.setEmail(newEmail);
        user.setEducation(blankToNull(request.education()));
        user.setSkills(blankToNull(request.skills()));
        user.setTargetRole(blankToNull(request.targetRole()));
        return userRepository.save(user);
    }

    /** Never includes the password hash. */
    public UserResponse toResponse(User u) {
        return new UserResponse(u.getId(), u.getName(), u.getEmail(), u.getEducation(),
                u.getSkills(), u.getTargetRole(), u.getCreatedAt());
    }

    private String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
