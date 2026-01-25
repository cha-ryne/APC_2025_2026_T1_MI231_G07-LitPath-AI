from django.db import models
from django.utils import timezone
from datetime import timedelta
import uuid
from django.contrib.auth.hashers import make_password, check_password
from django.contrib.postgres.fields import ArrayField

# Models for LitPath AI - Unified User Account System


class UserRole(models.TextChoices):
    """User role choices"""
    GUEST = 'guest', 'Guest'
    USER = 'user', 'User'
    STAFF = 'staff', 'Staff'
    ADMIN = 'admin', 'Admin'


class UserAccount(models.Model):
    """
    Unified user accounts - combines regular users and staff/admin
    Matches schema: User_Accounts table
    """
    id = models.AutoField(primary_key=True, db_column='user_ID')
    email = models.EmailField(unique=True, max_length=50, db_column='user_email')
    password_hash = models.CharField(max_length=200, db_column='user_password_hash')
    full_name = models.CharField(max_length=100, blank=True, null=True, db_column='user_full_name')
    username = models.CharField(max_length=50, unique=True, db_column='user_username')
    created_at = models.DateTimeField(auto_now_add=True, db_column='user_created_at')
    last_login = models.DateTimeField(blank=True, null=True, db_column='user_last_login')
    role = models.CharField(
        max_length=50, 
        choices=UserRole.choices, 
        default=UserRole.USER,
        db_column='user_role'
    )
    
    class Meta:
        db_table = 'user_accounts'
        ordering = ['-created_at']
    
    def set_password(self, raw_password):
        """Hash and set password"""
        self.password_hash = make_password(raw_password)
    
    def check_password(self, raw_password):
        """Verify password"""
        return check_password(raw_password, self.password_hash)
    
    def update_last_login(self):
        """Update last login timestamp"""
        self.last_login = timezone.now()
        self.save(update_fields=['last_login'])
    
    def is_staff_or_admin(self):
        """Check if user has staff or admin role"""
        return self.role in [UserRole.STAFF, UserRole.ADMIN]
    
    def __str__(self):
        return f"{self.username} ({self.role})"


class Session(models.Model):
    """
    User sessions - tracks both authenticated and anonymous sessions
    Matches schema: Sessions table
    One-to-One relationship: Each user can only have ONE active session at a time
    """
    id = models.AutoField(primary_key=True, db_column='session_ID')
    is_anonymous = models.BooleanField(default=False, db_column='session_is_anonymous')
    created_at = models.DateTimeField(auto_now_add=True, db_column='session_created_at')
    last_seen = models.DateTimeField(auto_now=True, db_column='session_last_seen')
    user = models.OneToOneField(
        UserAccount, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='session',
        db_column='USERS_ACCOUNTS_user_ID'
    )
    # Guest identifier for anonymous sessions
    guest_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    # Session token for validation
    session_token = models.CharField(max_length=255, unique=True, db_index=True)
    
    class Meta:
        db_table = 'sessions'
        ordering = ['-created_at']
    
    def is_expired(self, hours=24):
        """Check if session is older than specified hours"""
        expiry_time = self.last_seen + timedelta(hours=hours)
        return timezone.now() > expiry_time
    
    def update_activity(self):
        """Update last seen timestamp"""
        self.last_seen = timezone.now()
        self.save(update_fields=['last_seen'])
    
    @classmethod
    def create_for_user(cls, user):
        """Create a new session for an authenticated user (one-to-one)
        Deletes any existing session for this user first
        """
        import secrets
        # Delete existing session for this user (enforce one-to-one)
        cls.objects.filter(user=user).delete()
        
        session = cls.objects.create(
            user=user,
            is_anonymous=False,
            session_token=secrets.token_urlsafe(32)
        )
        return session
    
    @classmethod
    def create_guest_session(cls):
        """Create a new anonymous/guest session"""
        import secrets
        guest_id = f"guest_{int(timezone.now().timestamp())}_{secrets.token_hex(4)}"
        session = cls.objects.create(
            user=None,
            is_anonymous=True,
            guest_id=guest_id,
            session_token=secrets.token_urlsafe(32)
        )
        return session
    
    def __str__(self):
        if self.user:
            return f"Session for {self.user.username}"
        return f"Guest session {self.guest_id}"


# Keep legacy AdminUser for backward compatibility during migration
class AdminUser(models.Model):
    """
    DEPRECATED: Use UserAccount with role='admin' or role='staff' instead
    Kept for backward compatibility during migration
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, max_length=255)
    password = models.CharField(max_length=255)  # Will store hashed password
    full_name = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        db_table = 'admin_users'
        ordering = ['-created_at']
    
    def set_password(self, raw_password):
        """Hash and set password"""
        self.password = make_password(raw_password)
    
    def check_password(self, raw_password):
        """Verify password"""
        return check_password(raw_password, self.password)
    
    def __str__(self):
        return self.email

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
    
    def __str__(self):
        return f"{self.user_id}: {self.title}"


class ResearchHistory(models.Model):
    """User research session history"""
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
    
    def __str__(self):
        return f"{self.user_id}: {self.query[:50]}"


class Feedback(models.Model):
    """System Admin feedback"""
    # --- UPDATED CHOICES ---
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Reviewed', 'Reviewed'),
        ('Resolved', 'Resolved'), # Changed from Addressed
    ]
    
    CATEGORY_CHOICES = [
        ('Positive', 'Positive'),
        ('Issue', 'Issue'),
        ('For Improvement', 'For Improvement'),
    ]

    """User feedback"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.TextField(db_index=True)
    query = models.TextField(blank=True, null=True)
    rating = models.IntegerField(blank=True, null=True)
    relevant = models.BooleanField(blank=True, null=True)
    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    document_file = models.CharField(max_length=500, null=True, blank=True, db_index=True)

    # --- UPDATED TRIAGE FIELDS ---
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, null=True, blank=True)
    
    is_valid = models.BooleanField(null=True, blank=True)
    validity_remarks = models.TextField(blank=True, null=True)  # <--- NEW
    
    is_doable = models.BooleanField(null=True, blank=True)
    feasibility_remarks = models.TextField(blank=True, null=True) # <--- NEW
    
    class Meta:
        db_table = 'feedback'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user_id}: Rating {self.rating} ({self.status})"
    

class Material(models.Model):
    """Store metadata about theses/dissertations"""
    file = models.CharField(max_length=500, unique=True)
    title = models.TextField()
    author = models.TextField()
    year = models.IntegerField(null=True, blank=True)
    abstract = models.TextField(blank=True)
    degree = models.CharField(max_length=100, blank=True)
    subjects = ArrayField(
        models.CharField(max_length=200),
        blank=True,
        default=list
    )
    school = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'materials'
        indexes = [
            models.Index(fields=['file']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.year})"


class MaterialView(models.Model):
    """Track material views"""
    file = models.CharField(max_length=500, db_index=True)
    user_id = models.CharField(max_length=100, null=True, blank=True)
    session_id = models.CharField(max_length=100, null=True, blank=True)
    viewed_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'material_views'
        indexes = [
            models.Index(fields=['file']),
            models.Index(fields=['-viewed_at']),
            models.Index(fields=['user_id']),
        ]
    
    def __str__(self):
        return f"View of {self.file} at {self.viewed_at}"

