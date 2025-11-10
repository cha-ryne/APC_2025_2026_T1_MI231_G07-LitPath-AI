from django.db import models

# Create your models here.

# Future models will go here based on your ERD:
# - DocumentCache
# - SearchHistory
# - Bookmark
# - UsageStatistics
# - FeedbackLog
# - StaffAccount

# Example:
# class DocumentCache(models.Model):
#     document_key = models.CharField(max_length=255, unique=True)
#     document_data = models.JSONField()
#     created_at = models.DateTimeField(auto_now_add=True)
#     last_accessed = models.DateTimeField(auto_now=True)
#     status = models.CharField(max_length=50, default='active')
#     
#     class Meta:
#         db_table = 'document_cache'
#     
#     def __str__(self):
#         return self.document_key
