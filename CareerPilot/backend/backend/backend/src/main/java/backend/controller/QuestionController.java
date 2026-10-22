package backend.controller;

import backend.dto.QuestionDtos.*;
import backend.entity.User;
import backend.service.BookmarkService;
import backend.service.QuestionService;
import backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

/** Question bank, practice mode and bookmarks. */
@RestController
@RequestMapping("/api")
public class QuestionController {

    private final QuestionService questionService;
    private final BookmarkService bookmarkService;
    private final UserService userService;

    public QuestionController(QuestionService questionService, BookmarkService bookmarkService,
                              UserService userService) {
        this.questionService = questionService;
        this.bookmarkService = bookmarkService;
        this.userService = userService;
    }

    @GetMapping("/questions")
    public List<QuestionSummary> questions(Principal principal,
                                           @RequestParam(required = false) String role,
                                           @RequestParam(required = false) String topic,
                                           @RequestParam(required = false) String category,
                                           @RequestParam(required = false) String difficulty,
                                           @RequestParam(required = false) String search) {
        return questionService.search(user(principal), role, topic, category, difficulty, search);
    }

    @GetMapping("/questions/meta")
    public QuestionMeta meta() {
        return questionService.meta();
    }

    @GetMapping("/questions/{id}")
    public QuestionDetail question(Principal principal, @PathVariable Long id) {
        return questionService.detail(user(principal), id);
    }

    /** Practice mode: scores one answer and returns feedback. Nothing is saved. */
    @PostMapping("/practice/evaluate")
    public EvaluationResponse practice(@Valid @RequestBody PracticeRequest request) {
        return questionService.evaluatePractice(request);
    }

    @GetMapping("/bookmarks")
    public List<QuestionDetail> bookmarks(Principal principal) {
        return bookmarkService.list(user(principal));
    }

    @PostMapping("/bookmarks/{questionId}")
    public ResponseEntity<Void> addBookmark(Principal principal, @PathVariable Long questionId) {
        boolean created = bookmarkService.add(user(principal), questionId);
        return ResponseEntity.status(created ? HttpStatus.CREATED : HttpStatus.OK).build();
    }

    @DeleteMapping("/bookmarks/{questionId}")
    public ResponseEntity<Void> removeBookmark(Principal principal, @PathVariable Long questionId) {
        bookmarkService.remove(user(principal), questionId);
        return ResponseEntity.noContent().build();
    }

    private User user(Principal principal) {
        return userService.requireByEmail(principal.getName());
    }
}
