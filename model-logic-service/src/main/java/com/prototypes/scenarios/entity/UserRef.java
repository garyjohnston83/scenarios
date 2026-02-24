package com.prototypes.scenarios.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_ref")
public class UserRef {

    @Id
    @Column(nullable = false, length = 100)
    private String id;

    @Column(name = "display_name", nullable = false, length = 255)
    private String displayName;

    @Column(length = 255)
    private String email;

    @Column(name = "is_active", nullable = false)
    private boolean isActive;

    public UserRef() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
    }
}
