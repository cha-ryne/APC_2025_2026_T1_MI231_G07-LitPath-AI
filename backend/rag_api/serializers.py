
from rest_framework import serializers
from .models import UserAccount, Bookmark, ResearchHistory, Feedback, CSMFeedback

# Serializer for user profile update
class UserAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAccount
        fields = ['id', 'email', 'username', 'full_name', 'role']
        read_only_fields = ['id', 'email', 'role']


class BookmarkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bookmark
        fields = [
            'id', 'user_id', 'title', 'author', 'year', 'abstract',
            'file', 'degree', 'subjects', 'school', 'bookmarked_at', 'updated_at'
        ]
        read_only_fields = ['id', 'bookmarked_at', 'updated_at']


class ResearchHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ResearchHistory
        fields = [
            'id', 
            'session_id', 
            'user_id', 
            'query', 
            'all_queries',          # <--- Added this (stores follow-up query list)
            'conversation_data',    # <--- Added this (stores the actual Q&A)
            'conversation_length',  # <--- Added this (stores chat depth)
            'created_at', 
            'sources_count'         # <--- Critical for "Unanswered Questions" analytics
        ]
        read_only_fields = ['id', 'created_at']


class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class CSMFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = CSMFeedback
        fields = [
            'id', 'user_id', 'session_id',
            'consent_given', 'client_type', 'date', 'sex', 'age', 'region', 'category',
            'litpath_rating', 'research_interests', 'missing_content', 'message_comment',
            'created_at',
            # NEW Admin Fields
            'status', 'admin_category',
            'is_valid', 'validity_remarks',
            'is_doable', 'feasibility_remarks'
        ]
        read_only_fields = ['id', 'created_at']