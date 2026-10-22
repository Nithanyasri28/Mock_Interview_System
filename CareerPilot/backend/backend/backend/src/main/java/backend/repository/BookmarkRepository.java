package backend.repository;

import backend.entity.Bookmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {

    List<Bookmark> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<Bookmark> findByUserIdAndQuestionId(Long userId, Long questionId);

    @Query("select b.question.id from Bookmark b where b.user.id = :userId")
    List<Long> findQuestionIdsByUserId(@Param("userId") Long userId);
}
