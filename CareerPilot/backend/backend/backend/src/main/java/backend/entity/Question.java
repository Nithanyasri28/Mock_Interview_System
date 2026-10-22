package backend.entity;

import jakarta.persistence.*;

/** One question in the local question bank (seeded from questions.txt). */
@Entity
@Table(name = "questions")
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Comma separated role names, or ALL. */
    @Column(length = 500)
    private String roles;

    /** TECHNICAL, HR or BEHAVIORAL. */
    @Column(length = 20)
    private String category;

    @Column(length = 60)
    private String topic;

    /** BEGINNER, INTERMEDIATE or ADVANCED. */
    @Column(length = 20)
    private String difficulty;

    @Column(name = "question_text", columnDefinition = "TEXT", nullable = false)
    private String questionText;

    /** Semicolon separated key concepts; each may list synonyms separated by "/". */
    @Column(columnDefinition = "TEXT")
    private String keywords;

    @Column(columnDefinition = "TEXT")
    private String referenceAnswer;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getRoles() {
        return roles;
    }

    public void setRoles(String roles) {
        this.roles = roles;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getTopic() {
        return topic;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public String getQuestionText() {
        return questionText;
    }

    public void setQuestionText(String questionText) {
        this.questionText = questionText;
    }

    public String getKeywords() {
        return keywords;
    }

    public void setKeywords(String keywords) {
        this.keywords = keywords;
    }

    public String getReferenceAnswer() {
        return referenceAnswer;
    }

    public void setReferenceAnswer(String referenceAnswer) {
        this.referenceAnswer = referenceAnswer;
    }
}
