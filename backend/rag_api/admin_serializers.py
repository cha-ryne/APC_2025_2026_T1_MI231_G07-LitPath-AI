from rest_framework import serializers
from .models import AdminUser

class AdminLoginSerializer(serializers.Serializer):
    """Serializer for admin login"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

class AdminUserSerializer(serializers.ModelSerializer):
    """Serializer for admin user data (excludes password)"""
    class Meta:
        model = AdminUser
        fields = ['id', 'email', 'full_name', 'is_active', 'created_at', 'last_login']
        read_only_fields = ['id', 'created_at', 'last_login']

class AdminCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating admin users"""
    password = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = AdminUser
        fields = ['email', 'password', 'full_name', 'is_active']
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        admin = AdminUser(**validated_data)
        admin.set_password(password)
        admin.save()
        return admin
