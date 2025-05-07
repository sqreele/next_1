from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import RoomViewSet, TopicViewSet, JobViewSet, PropertyViewSet, UserProfileViewSet
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from django.http import HttpResponse


from .views import CustomSessionView 
from .views import log_view
# Set the app name correctly
app_name = 'myappLubd'

def health_check(request):
    return HttpResponse("OK")

# Create a router and register viewsets
router = DefaultRouter()
router.register(r'rooms', RoomViewSet)
router.register(r'topics', TopicViewSet)
router.register(r'jobs', JobViewSet)
router.register(r'properties', PropertyViewSet)
router.register(r'user-profiles', UserProfileViewSet)
router.register(r'preventive-maintenance', views.PreventiveMaintenanceViewSet, basename='preventive-maintenance')
# Define the URL patterns
urlpatterns = [
    # Include API routes under the 'api/' path
    path('api/', include(router.urls)),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/session/', CustomSessionView.as_view(), name='auth_session'),
    path('api/v1/auth/_log', log_view, name='log_view'),
   # path('api/v1/auth/google/', views.google_auth, name='google-auth'),
      path('api/v1/auth/check/', views.auth_check, name='auth_check'),
    path('health/', health_check, name='health_check'),
    #path('api/providers/', views.auth_providers, name='auth_providers'),
    #path('api/v1/auth/error/', views.auth_error, name='auth_error'),
    path('api/auth/login/', views.login_view, name='login'),     
     path('api/health/', health_check, name='health_check'),
    path('api/v1/auth/register/', views.RegisterView.as_view(), name='register'),
     path('api/preventive-maintenance/', views.get_preventive_maintenance_data, name='preventive_maintenance_data'),
    path('api/preventive-maintenance/jobs/', views.get_preventive_maintenance_jobs, name='preventive_maintenance_jobs'),
    path('api/preventive-maintenance/rooms/', views.get_preventive_maintenance_rooms, name='preventive_maintenance_rooms'),
    path('api/preventive-maintenance/topics/', views.get_preventive_maintenance_topics, name='preventive_maintenance_topics'),
    path('api/properties/<str:property_id>/is_preventivemaintenance/', 
     views.property_is_preventivemaintenance, 
     name='property_is_preventivemaintenance'),
    # Direct path for is_preventivemaintenance (with trailing slash)
path('api/properties/<str:property_id>/is_preventivemaintenance/', 
     views.property_is_preventivemaintenance, 
     name='property_is_preventivemaintenance'),
     
# Direct path for is_preventivemaintenance (without trailing slash)
path('api/properties/<str:property_id>/is_preventivemaintenance', 
     views.property_is_preventivemaintenance, 
     name='property_is_preventivemaintenance_no_slash'),
    path('api/jobs/<str:job_id>/preventive-maintenance/', 
         views.PreventiveMaintenanceViewSet.as_view({'get': 'list', 'post': 'create'}), 
         name='job-preventive-maintenance'),
   
    # Your existing paths...
    path('api/api-auth/', include('rest_framework.urls')),
]


