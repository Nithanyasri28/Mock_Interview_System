package backend.service;

import backend.dto.QuestionDtos.QuestionDetail;
import backend.entity.Bookmark;
import backend.entity.Question;
import backend.entity.User;
import backend.repository.BookmarkRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class BookmarkService {

    private final BookmarkRepository bookmarkRepository;
    private final QuestionService questionService;

    public BookmarkService(BookmarkRepository bookmarkRepository, QuestionService questionService) {
        this.bookmarkRepository = bookmarkRepository;
        this.questionService = questionService;
    }

    @Transactional(readOnly = true)
    public List<QuestionDetail> list(User user) {
        List<QuestionDetail> out = new ArrayList<>();
        for (Bookmark b : bookmarkRepository.findByUserIdOrderByCreatedAtDesc(user.getId())) {
            out.add(questionService.toDetail(b.getQuestion(), true));
        }
        return out;
    }

    /** Returns true if a new bookmark was created, false if it already existed. */
    @Transactional
    public boolean add(User user, Long questionId) {
        if (bookmarkRepository.findByUserIdAndQuestionId(user.getId(), questionId).isPresent()) return false;
        Question q = questionService.require(questionId);
        Bookmark b = new Bookmark();
        b.setUser(user);
        b.setQuestion(q);
        bookmarkRepository.save(b);
        return true;
    }

    @Transactional
    public void remove(User user, Long questionId) {
        bookmarkRepository.findByUserIdAndQuestionId(user.getId(), questionId)
                .ifPresent(bookmarkRepository::delete);
    }
}
