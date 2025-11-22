from django.db import models
from django.utils import timezone
from datetime import timedelta
import uuid

# Models for LitPath AI - Matches existing Supabase schema

class Bookmark(models.Model):
    """User bookmarks for research papers - Auto-delete after 30 days"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.CharField(max_length=255, db_index=True)
    title = models.TextField()
    author = models.CharField(max_length=500, blank=True, null=True)
    year = models.IntegerField(blank=True, null=True)
    abstract = models.TextField(blank=True, null=True)
    file = models.CharField(max_length=500)
    degree = models.CharField(max_length=200, blank=True, null=True)
    subjects = models.TextField(blank=True, null=True)
    school = models.CharField(max_length=500, blank=True, null=True)
    bookmarked_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'bookmarks'
        ordering = ['-bookmarked_at']
        unique_together = [['user_id', 'file']]
    
    def is_expired(self):
        """Check if bookmark is older than 30 days"""
        expiry_date = self.bookmarked_at + timedelta(days=30)
        return timezone.now() > expiry_date
    
    def __str__(self):
        return f"{self.user_id}: {self.title}"


class ResearchHistory(models.Model):
    """User research session history - Auto-delete after 30 days"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session_id = models.TextField(db_index=True)
    user_id = models.TextField(db_index=True)
    query = models.TextField()
    all_queries = models.JSONField(blank=True, null=True)
    conversation_data = models.JSONField(blank=True, null=True)
    sources_count = models.IntegerField(blank=True, null=True)
    conversation_length = models.IntegerField(blank=True, null=True)
    subjects = models.TextField(blank=True, null=True)
    date_filter = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'research_history'
        ordering = ['-created_at']
    
    def is_expired(self):
        """Check if history is older than 30 days"""
        expiry_date = self.created_at + timedelta(days=30)
        return timezone.now() > expiry_date
    
    def __str__(self):
        return f"{self.user_id}: {self.query[:50]}"


class Feedback(models.Model):
    """User feedback - Auto-delete after 30 days"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.TextField(db_index=True)
    query = models.TextField(blank=True, null=True)
    rating = models.IntegerField(blank=True, null=True)
    relevant = models.BooleanField(blank=True, null=True)
    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'feedback'
        ordering = ['-created_at']
    
    def is_expired(self):
        """Check if feedback is older than 30 days"""
        expiry_date = self.created_at + timedelta(days=30)
        return timezone.now() > expiry_date
    
    def __str__(self):
        return f"{self.user_id}: Rating {self.rating}"

