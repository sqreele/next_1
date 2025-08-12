from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views
from .views import (
    RoomViewSet, TopicViewSet, JobViewSet, PropertyViewSet,
    UserProfileViewSet, UserViewSet, MachineViewSet,
    PreventiveMaintenanceImageUploadView, PreventiveMaintenanceViewSet
)

# Set the app name
app_name = 'myappLubd'

# Create a router and register viewsets
router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'rooms', RoomViewSet, basename='room')
router.register(r'topics', TopicViewSet)
router.register(r'jobs', JobViewSet)
router.register(r'properties', PropertyViewSet)
router.register(r'user-profiles', UserProfileViewSet)
router.register(r'preventive-maintenance', PreventiveMaintenanceViewSet, basename='preventive-maintenance')
router.register(r'machines', MachineViewSet, basename='machine')

# Define the URL patterns
urlpatterns = [
    # API routes under 'api/v1/'
    path('api/v1/', include(router.urls)),
    
    # Authentication endpoints
    path('api/v1/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/v1/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/v1/auth/session/', views.CustomSessionView.as_view(), name='auth_session'),
    path('api/v1/auth/_log', views.log_view, name='log_view'),
    path('api/v1/auth/check/', views.auth_check, name='auth_check'),
    path('api/v1/auth/login/', views.login_view, name='login'),
    path('api/v1/auth/register/', views.RegisterView.as_view(), name='register'),
    path('api/v1/auth/google/', views.google_auth, name='google_auth'),
    path('api/v1/auth/providers/', views.auth_providers, name='auth_providers'),
    path('api/v1/auth/password/forgot/', views.forgot_password, name='forgot_password'),
    path('api/v1/auth/password/reset/', views.reset_password, name='reset_password'),
    
    # Health check
    path('api/v1/health/', views.health_check, name='health_check'),
    
    # Preventive maintenance endpoints
    path('api/v1/preventive-maintenance/<str:pm_id>/upload-images/', PreventiveMaintenanceImageUploadView.as_view(), name='upload_pm_images'),
    path('api/v1/preventive-maintenance/', views.get_preventive_maintenance_data, name='preventive_maintenance_data'),
    path('api/v1/preventive-maintenance/jobs/', views.get_preventive_maintenance_jobs, name='preventive_maintenance_jobs'),
    path('api/v1/preventive-maintenance/rooms/', views.get_preventive_maintenance_rooms, name='preventive_maintenance_rooms'),
    path('api/v1/preventive-maintenance/topics/', views.get_preventive_maintenance_topics, name='preventive_maintenance_topics'),
    
    # Property preventive maintenance
    path('api/v1/properties/<str:property_id>/is-preventivemaintenance/', views.property_is_preventivemaintenance, name='property_is_preventivemaintenance'),
]
