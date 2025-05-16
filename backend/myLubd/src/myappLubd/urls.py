# myappLubd/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import (
    RoomViewSet, TopicViewSet, JobViewSet, PropertyViewSet,
    UserProfileViewSet, UserViewSet,MachineViewSet
)
from .views import PreventiveMaintenanceImageUploadView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView
)
from django.http import HttpResponse

# Set the app name correctly
app_name = 'myappLubd'

def health_check(request):
    return HttpResponse("OK")

# Create a router and register viewsets
router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'rooms', RoomViewSet)
router.register(r'topics', TopicViewSet)
router.register(r'jobs', JobViewSet)
router.register(r'properties', PropertyViewSet)
router.register(r'user-profiles', UserProfileViewSet)
router.register(r'preventive-maintenance', 
    views.PreventiveMaintenanceViewSet, 
    basename='preventive-maintenance'
)
router.register(r'machines', views.MachineViewSet, basename='machine')
# Define the URL patterns
urlpatterns = [
    # Include API routes under the 'api/' path
    path('api/', include(router.urls)),
    
    # Authentication endpoints
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/session/', views.CustomSessionView.as_view(), name='auth_session'),
    path('api/v1/auth/_log', views.log_view, name='log_view'),
    path('api/v1/auth/check/', views.auth_check, name='auth_check'),
    path('api/auth/login/', views.login_view, name='login'),
    path('api/v1/auth/register/', views.RegisterView.as_view(), name='register'),
   
    # Health check
    path('health/', health_check, name='health_check'),
    path('api/preventive-maintenance/<str:pm_id>/upload-images/', PreventiveMaintenanceImageUploadView.as_view(), name='upload_pm_images'),
    # Preventive maintenance endpoints
    path('api/preventive-maintenance/', views.get_preventive_maintenance_data, name='preventive_maintenance_data'),
    path('api/preventive-maintenance/jobs/', views.get_preventive_maintenance_jobs, name='preventive_maintenance_jobs'),
    path('api/preventive-maintenance/rooms/', views.get_preventive_maintenance_rooms, name='preventive_maintenance_rooms'),
    path('api/preventive-maintenance/topics/', views.get_preventive_maintenance_topics, name='preventive_maintenance_topics'),
    
    # Property preventive maintenance
    path('api/properties/is_preventivemaintenance/', views.property_is_preventivemaintenance, name='property_is_preventivemaintenance'),
    path('api/properties/is_preventivemaintenance', views.property_is_preventivemaintenance, name='property_is_preventivemaintenance_no_slash'),
    
    # Job preventive maintenance
    path('api/jobs/preventive-maintenance/', 
         views.PreventiveMaintenanceViewSet.as_view({'get': 'list', 'post': 'create'}), 
         name='job-preventive-maintenance'),


]
