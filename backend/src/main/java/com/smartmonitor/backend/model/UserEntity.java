package com.smartmonitor.backend.model;

import com.google.cloud.Timestamp;
import java.util.ArrayList;
import java.util.List;

public class UserEntity {
    private String email;
    private String role;
    private List<String> fcmTokens = new ArrayList<>();
    private Timestamp createdAt;

    public UserEntity() {}

    public UserEntity(String email, String role, List<String> fcmTokens, Timestamp createdAt) {
        this.email = email;
        this.role = role;
        this.fcmTokens = fcmTokens;
        this.createdAt = createdAt;
    }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public List<String> getFcmTokens() { return fcmTokens; }
    public void setFcmTokens(List<String> fcmTokens) { this.fcmTokens = fcmTokens; }
    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }
}
