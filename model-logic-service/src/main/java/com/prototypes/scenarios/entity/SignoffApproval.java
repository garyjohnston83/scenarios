package com.prototypes.scenarios.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "signoff_approval", uniqueConstraints = {
        @UniqueConstraint(name = "uq_signoff_approval_case_user", columnNames = {"signoff_case_id", "user_id"})
})
public class SignoffApproval {

    @Id
    @Column(nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "signoff_case_id", nullable = false)
    private SignoffCase signoffCase;

    @Column(name = "user_id", nullable = false, length = 100)
    private String userId;

    @Column(name = "approved_at", nullable = false)
    private LocalDateTime approvedAt;

    public SignoffApproval() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public SignoffCase getSignoffCase() {
        return signoffCase;
    }

    public void setSignoffCase(SignoffCase signoffCase) {
        this.signoffCase = signoffCase;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public LocalDateTime getApprovedAt() {
        return approvedAt;
    }

    public void setApprovedAt(LocalDateTime approvedAt) {
        this.approvedAt = approvedAt;
    }
}
