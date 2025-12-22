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
