from django.core.mail import send_mail
import secrets
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
# --- Password Reset Request Endpoint ---
@api_view(['POST'])
def auth_password_reset_request_view(request):
    """
    Request a password reset link.
    Expects: { email: string }
    Returns: { success: bool, message: string }
    """
    email = request.data.get('email', '').strip().lower()
    if not email:
        return Response({'success': False, 'message': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
    user = UserAccount.objects.filter(email=email).first()
    if user:
        # Generate a reset token (in production, store this in DB and expire it)
        reset_token = secrets.token_urlsafe(32)
        # For now, just print the reset link (simulate email)
        reset_link = f"http://localhost:5173/reset-password/{reset_token}"
        print(f"[DEBUG] Password reset link for {email}: {reset_link}")
        # In production, send email:
        send_mail('Password Reset', f'Click to reset your password: {reset_link}', settings.DEFAULT_FROM_EMAIL, [email])
        # Optionally, store the token in the user model or a separate table
    # Always return success for security
    return Response({'success': True, 'message': 'If this email exists, a reset link will be sent.'})

from .serializers import UserAccountSerializer
# --- Profile Update Endpoint ---
from rest_framework.permissions import IsAuthenticated

@api_view(['POST'])
def auth_update_profile_view(request):
    """
    Update user profile (full_name, username)
    Expects: { full_name?: string, username?: string }
    Requires: Authorization: Bearer <session_token>
    """
    auth_header = request.headers.get('Authorization', '')
    print('DEBUG: Authorization header:', auth_header)
    if not auth_header.startswith('Bearer '):
        print('DEBUG: No Bearer token in Authorization header')
        return Response({'success': False, 'message': 'No session token provided'}, status=status.HTTP_401_UNAUTHORIZED)
    session_token = auth_header[7:]
    print('DEBUG: Extracted session_token:', session_token)
    session = Session.objects.filter(session_token=session_token).first()
    print('DEBUG: Session lookup result:', session)
    if not session or not session.user:
        print('DEBUG: Invalid or expired session')
        return Response({'success': False, 'message': 'Invalid or expired session'}, status=status.HTTP_401_UNAUTHORIZED)
    user = session.user
    data = request.data
    new_username = data.get('username', '').strip()
    new_full_name = data.get('full_name', '').strip()
    # Check if username is changing and unique
    if new_username and new_username != user.username:
        if UserAccount.objects.filter(username=new_username).exclude(id=user.id).exists():
            return Response({'success': False, 'message': 'Username already taken'}, status=status.HTTP_400_BAD_REQUEST)
        user.username = new_username
    if new_full_name:
        user.full_name = new_full_name
    user.save()
    serializer = UserAccountSerializer(user)
    return Response({'success': True, 'user': serializer.data})
"""
Authentication Views for LitPath AI
Handles login, logout, guest sessions, and session validation
"""
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from .models import UserAccount, Session, UserRole


@api_view(['POST'])
def auth_login_view(request):
    """
    Login endpoint for authenticated users
    Expects: { email: string, password: string }
    Returns: { success: bool, user: object, session: object }
    """
    email = request.data.get('email', '').strip().lower()
    password = request.data.get('password', '')
    
    if not email or not password:
        return Response({
            'success': False,
            'message': 'Email and password are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Find user by email
        user = UserAccount.objects.filter(email=email).first()
        
        if not user:
            return Response({
                'success': False,
                'message': 'Invalid email or password'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Verify password
        if not user.check_password(password):
            return Response({
                'success': False,
                'message': 'Invalid email or password'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Update last login
        user.update_last_login()
        
        # Create new session
        session = Session.create_for_user(user)
        
        return Response({
            'success': True,
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'full_name': user.full_name,
                'role': user.role
            },
            'session': {
                'session_id': session.id,
                'session_token': session.session_token,
                'created_at': session.created_at.isoformat(),
                'is_anonymous': False
            }
        })
        
    except Exception as e:
        print(f"Login error: {e}")
        return Response({
            'success': False,
            'message': 'An error occurred during login'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def auth_register_view(request):
    """
    Register a new user account
    Expects: { email: string, password: string, username: string, full_name?: string }
    Returns: { success: bool, user: object, session: object }
    """
    email = request.data.get('email', '').strip().lower()
    password = request.data.get('password', '')
    username = request.data.get('username', '').strip()
    full_name = request.data.get('full_name', '').strip()
    
    if not email or not password or not username:
        return Response({
            'success': False,
            'message': 'Email, password, and username are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate password length
    if len(password) < 6:
        return Response({
            'success': False,
            'message': 'Password must be at least 6 characters'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Check if email already exists
        if UserAccount.objects.filter(email=email).exists():
            return Response({
                'success': False,
                'message': 'Email already registered'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if username already exists
        if UserAccount.objects.filter(username=username).exists():
            return Response({
                'success': False,
                'message': 'Username already taken'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create new user
        user = UserAccount(
            email=email,
            username=username,
            full_name=full_name or username,
            role=UserRole.USER
        )
        user.set_password(password)
        user.save()
        
        # Create session for new user
        session = Session.create_for_user(user)
        
        return Response({
            'success': True,
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'full_name': user.full_name,
                'role': user.role
            },
            'session': {
                'session_id': session.id,
                'session_token': session.session_token,
                'created_at': session.created_at.isoformat(),
                'is_anonymous': False
            }
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        print(f"Registration error: {e}")
        return Response({
            'success': False,
            'message': 'An error occurred during registration'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def auth_guest_session_view(request):
    """
    Create a guest session for anonymous users
    Returns: { success: bool, session: object }
    """
    try:
        # Create guest session
        session = Session.create_guest_session()
        
        return Response({
            'success': True,
            'session': {
                'session_id': session.id,
                'session_token': session.session_token,
                'guest_id': session.guest_id,
                'created_at': session.created_at.isoformat(),
                'is_anonymous': True
            }
        })
        
    except Exception as e:
        print(f"Guest session error: {e}")
        return Response({
            'success': False,
            'message': 'An error occurred creating guest session'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def auth_validate_session_view(request):
    """
    Validate an existing session
    Expects: { session_id: int } or { session_token: string }
    Returns: { valid: bool, user?: object }
    """
    session_id = request.data.get('session_id')
    session_token = request.data.get('session_token')
    
    if not session_id and not session_token:
        return Response({
            'valid': False,
            'message': 'Session ID or token required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Find session
        if session_token:
            session = Session.objects.filter(session_token=session_token).first()
        else:
            session = Session.objects.filter(id=session_id).first()
        
        if not session:
            return Response({'valid': False})
        
        # Check if session is expired (24 hours for guests, 7 days for authenticated)
        expiry_hours = 24 if session.is_anonymous else 168  # 7 days
        if session.is_expired(hours=expiry_hours):
            session.delete()
            return Response({'valid': False})
        
        # Update activity
        session.update_activity()
        
        # Return user info if authenticated
        if session.user:
            return Response({
                'valid': True,
                'user': {
                    'id': session.user.id,
                    'email': session.user.email,
                    'username': session.user.username,
                    'full_name': session.user.full_name,
                    'role': session.user.role
                },
                'session': {
                    'session_id': session.id,
                    'is_anonymous': False
                }
            })
        else:
            return Response({
                'valid': True,
                'session': {
                    'session_id': session.id,
                    'guest_id': session.guest_id,
                    'is_anonymous': True
                }
            })
        
    except Exception as e:
        print(f"Session validation error: {e}")
        return Response({'valid': False})


@api_view(['POST'])
def auth_logout_view(request):
    """
    Logout and invalidate session
    Expects: { session_id: int } or { session_token: string }
    """
    session_id = request.data.get('session_id')
    session_token = request.data.get('session_token')
    
    try:
        if session_token:
            Session.objects.filter(session_token=session_token).delete()
        elif session_id:
            Session.objects.filter(id=session_id).delete()
        
        return Response({'success': True})
        
    except Exception as e:
        print(f"Logout error: {e}")
        return Response({'success': True})  # Always return success for logout


@api_view(['POST'])
def auth_delete_guest_data_view(request):
    """
    Delete all data associated with a guest session (for privacy on public devices)
    Expects: { guest_id: string } or { session_token: string }
    """
    guest_id = request.data.get('guest_id')
    session_token = request.data.get('session_token')
    
    try:
        # Find the session
        session = None
        if session_token:
            session = Session.objects.filter(session_token=session_token, is_anonymous=True).first()
        elif guest_id:
            session = Session.objects.filter(guest_id=guest_id, is_anonymous=True).first()
        
        if session:
            guest_identifier = session.guest_id
            
            # Import here to avoid circular imports
            from .models import Bookmark, ResearchHistory, Feedback
            
            # Delete all guest data
            Bookmark.objects.filter(user_id=guest_identifier).delete()
            ResearchHistory.objects.filter(user_id=guest_identifier).delete()
            Feedback.objects.filter(user_id=guest_identifier).delete()
            
            # Delete the session
            session.delete()
            
            return Response({
                'success': True,
                'message': 'Guest data deleted successfully'
            })
        
        return Response({
            'success': True,
            'message': 'No guest session found'
        })
        
    except Exception as e:
        print(f"Delete guest data error: {e}")
        return Response({
            'success': False,
            'message': 'An error occurred'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def auth_me_view(request):
    """
    Get current user info from session token
    Expects: Authorization header with session token
    """
    auth_header = request.headers.get('Authorization', '')
    
    if not auth_header.startswith('Bearer '):
        return Response({
            'authenticated': False,
            'message': 'No session token provided'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    session_token = auth_header[7:]  # Remove 'Bearer ' prefix
    
    try:
        session = Session.objects.filter(session_token=session_token).first()
        
        if not session:
            return Response({
                'authenticated': False,
                'message': 'Invalid session'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check expiry
        expiry_hours = 24 if session.is_anonymous else 168
        if session.is_expired(hours=expiry_hours):
            session.delete()
            return Response({
                'authenticated': False,
                'message': 'Session expired'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Update activity
        session.update_activity()
        
        if session.user:
            return Response({
                'authenticated': True,
                'user': {
                    'id': session.user.id,
                    'email': session.user.email,
                    'username': session.user.username,
                    'full_name': session.user.full_name,
                    'role': session.user.role
                },
                'is_guest': False
            })
        else:
            return Response({
                'authenticated': True,
                'user': {
                    'id': session.guest_id,
                    'username': 'Guest',
                    'role': 'guest'
                },
                'is_guest': True
            })
            
    except Exception as e:
        print(f"Auth me error: {e}")
        return Response({
            'authenticated': False,
            'message': 'An error occurred'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def auth_change_password_view(request):
    """
    Change password for authenticated user
    Expects: { user_id: int, current_password: string, new_password: string }
    Returns: { success: bool, message: string }
    """
    user_id = request.data.get('user_id')
    current_password = request.data.get('current_password', '')
    new_password = request.data.get('new_password', '')
    
    if not user_id or not current_password or not new_password:
        return Response({
            'success': False,
            'message': 'User ID, current password, and new password are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate new password length
    if len(new_password) < 6:
        return Response({
            'success': False,
            'message': 'New password must be at least 6 characters'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Find user
        user = UserAccount.objects.filter(id=user_id).first()
        
        if not user:
            return Response({
                'success': False,
                'message': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Verify current password
        if not user.check_password(current_password):
            return Response({
                'success': False,
                'message': 'Current password is incorrect'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Update password
        user.set_password(new_password)
        user.save()
        
        return Response({
            'success': True,
            'message': 'Password changed successfully'
        })
        
    except Exception as e:
        print(f"Change password error: {e}")
        return Response({
            'success': False,
            'message': 'An error occurred while changing password'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def auth_reset_password_view(request):
    """
    Reset password using a token
    Expects: { token: string, password: string }
    Returns: { success: bool, message: string }
    """
    token = request.data.get('token', '')
    password = request.data.get('password', '')
    if not token or not password:
        return Response({'success': False, 'message': 'Token and new password are required'}, status=status.HTTP_400_BAD_REQUEST)
    # For demo: store tokens in memory (in production, use DB)
    # We'll use a simple in-memory dict for this session
    if not hasattr(auth_reset_password_view, 'token_map'):
        auth_reset_password_view.token_map = {}
    token_map = auth_reset_password_view.token_map
    # Find user by token (simulate DB lookup)
    user = None
    for u in UserAccount.objects.all():
        if hasattr(u, 'reset_token') and u.reset_token == token:
            user = u
            break
    if not user:
        return Response({'success': False, 'message': 'Invalid or expired token'}, status=status.HTTP_400_BAD_REQUEST)
    if len(password) < 6:
        return Response({'success': False, 'message': 'Password must be at least 6 characters'}, status=status.HTTP_400_BAD_REQUEST)
    user.set_password(password)
    user.save()
    # Remove token after use
    delattr(user, 'reset_token')
    return Response({'success': True, 'message': 'Password reset successful'})
