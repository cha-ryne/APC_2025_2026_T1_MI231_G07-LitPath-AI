
from rest_framework import serializers
from .models import UserAccount, Bookmark, ResearchHistory, Feedback

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
            'id', 'session_id', 'user_id', 'query', 'all_queries',
            'conversation_data', 'sources_count', 'conversation_length',
            'subjects', 'date_filter', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        # fields = [
        #    'id', 'user_id', 'query', 'rating', 'relevant',
        #    'comment', 'created_at'
        #]
        fields = '__all__'
        read_only_fields = ['id', 'created_at']
