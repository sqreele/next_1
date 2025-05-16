from django.contrib.auth import get_user_model
from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Prefetch 
from rest_framework_simplejwt.tokens import RefreshToken
from google.oauth2 import id_token
from google.auth.transport import requests
from django.utils import timezone
from django.db.models import Count, Q, F, ExpressionWrapper, fields, Case, When, Value
from .models import UserProfile, Property, Room, Topic, Job, Session, PreventiveMaintenance, JobImage
from django.urls import reverse
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .serializers import (
    UserProfileSerializer, PropertySerializer, RoomSerializer, TopicSerializer, JobSerializer,
    UserSerializer, PreventiveMaintenanceSerializer, PreventiveMaintenanceCreateUpdateSerializer,
    PreventiveMaintenanceCompleteSerializer, PreventiveMaintenanceListSerializer,
    PropertyPMStatusSerializer
)
from rest_framework import viewsets, filters, status
from .models import Machine
from .serializers import (
    MachineListSerializer,
    MachineDetailSerializer,
    MachineCreateSerializer,
    MachineUpdateSerializer,
    MachinePreventiveMaintenanceSerializer,
    MachineSerializer
)




from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile
from django_filters.rest_framework import DjangoFilterBackend
import math
from rest_framework.pagination import PageNumberPagination
from rest_framework import viewsets, status, permissions
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from django.contrib.auth.models import User
from rest_framework import routers, serializers, viewsets
import logging
import json
import uuid
from django.utils import timezone
from datetime import timedelta
from django.shortcuts import get_object_or_404

logger = logging.getLogger(__name__)
User = get_user_model()
from django.http import JsonResponse, HttpResponseRedirect
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone

from .models import PreventiveMaintenance, JobImage



from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Q, F, ExpressionWrapper, fields
from datetime import timedelta
import math

from .models import PreventiveMaintenance, Topic
from .serializers import (
    PreventiveMaintenanceSerializer, 
    PreventiveMaintenanceDetailSerializer,
    PreventiveMaintenanceListSerializer,
    PreventiveMaintenanceCompleteSerializer,
    TopicSerializer
)

class PreventiveMaintenanceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for PreventiveMaintenance model.
    Provides standard CRUD operations plus custom endpoints:
    - stats: Get statistics about preventive maintenance
    - upcoming: Get list of upcoming maintenance tasks
    - overdue: Get list of overdue maintenance tasks
    - complete: Mark a maintenance task as completed
    - upload_images: Upload before/after images for maintenance tasks
    - reschedule: Reschedule a maintenance task
    - by_priority: Get tasks sorted by priority
    """
    serializer_class = PreventiveMaintenanceSerializer
    lookup_field = 'pm_id'
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filterset_fields = ['topics__id', 'frequency', 'status']
    search_fields = ['pm_id', 'title', 'description']
    ordering_fields = ['scheduled_date', 'created_date', 'frequency']
    ordering = ['-scheduled_date']
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        """
        Return a queryset filtered by request parameters.
        Supports filtering by:
        - status (completed, pending, overdue)
        - topic_id
        - date_from & date_to
        - pm_id (exact match)
        - priority
        """
        queryset = PreventiveMaintenance.objects.all()
        
        # Get filter parameters
        pm_id = self.request.query_params.get('pm_id', None)
        status_param = self.request.query_params.get('status', None)
        topic_id = self.request.query_params.get('topic_id', None)
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        priority = self.request.query_params.get('priority', None)
        
        # Apply filters if provided
        if pm_id:
            queryset = queryset.filter(pm_id__icontains=pm_id)
        
        if status_param:
            now = timezone.now()
            if status_param == 'completed':
                queryset = queryset.filter(completed_date__isnull=False)
            elif status_param == 'pending':
                queryset = queryset.filter(
                    completed_date__isnull=True,
                    scheduled_date__gte=now
                )
            elif status_param == 'overdue':
                queryset = queryset.filter(
                    completed_date__isnull=True,
                    scheduled_date__lt=now
                )
        
        if topic_id:
            queryset = queryset.filter(topics__id=topic_id)
        
        if date_from:
            queryset = queryset.filter(scheduled_date__gte=date_from)
        
        if date_to:
            queryset = queryset.filter(scheduled_date__lte=date_to)
            
        if priority:
            queryset = queryset.filter(priority=priority)
        
        return queryset.distinct()
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return PreventiveMaintenanceListSerializer
        elif self.action in ['retrieve', 'create', 'update', 'partial_update']:
            return PreventiveMaintenanceDetailSerializer
        elif self.action == 'complete':
            return PreventiveMaintenanceCompleteSerializer
        
        return self.serializer_class
    
    def perform_create(self, serializer):
        """Add the current user as the creator when creating a record"""
        serializer.save(created_by=self.request.user)
        
    def perform_update(self, serializer):
        """Add the current user as the updater when updating a record"""
        serializer.save(updated_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get statistics about preventive maintenance tasks
        Returns:
        - counts: Counts of total, completed, pending, and overdue tasks
        - frequency_distribution: Distribution of tasks by frequency
        - priority_distribution: Distribution of tasks by priority
        - completion_rate: Rate of completion for scheduled tasks
        - upcoming: List of upcoming maintenance tasks (next 7 days)
        """
        # Get current date for status calculations
        now = timezone.now()
        
        # Get all maintenance records
        queryset = self.get_queryset()
        
        # Calculate counts
        total = queryset.count()
        completed = queryset.filter(completed_date__isnull=False).count()
        overdue = queryset.filter(
            completed_date__isnull=True,
            scheduled_date__lt=now
        ).count()
        pending = total - completed - overdue
        
        # Calculate frequency distribution
        frequency_queryset = queryset.values('frequency').annotate(count=Count('frequency'))
        frequency_distribution = [
            {'frequency': item['frequency'], 'count': item['count']}
            for item in frequency_queryset
        ]
        
        # Calculate priority distribution
        priority_queryset = queryset.values('priority').annotate(count=Count('priority'))
        priority_distribution = [
            {'priority': item['priority'], 'count': item['count']}
            for item in priority_queryset
        ]
        
        # Calculate completion rate (tasks completed on time vs total completed)
        completed_tasks = queryset.filter(completed_date__isnull=False)
        completed_count = completed_tasks.count()
        on_time_count = completed_tasks.filter(
            completed_date__lte=F('scheduled_date')
        ).count()
        
        completion_rate = (on_time_count / completed_count * 100) if completed_count > 0 else 0
        
        # Get upcoming maintenance (next 7 days)
        seven_days_later = now + timedelta(days=7)
        upcoming_queryset = queryset.filter(
            completed_date__isnull=True,
            scheduled_date__gte=now,
            scheduled_date__lte=seven_days_later
        ).order_by('scheduled_date')[:5]  # Limit to 5 items
        
        upcoming_serializer = PreventiveMaintenanceListSerializer(
            upcoming_queryset, 
            many=True,
            context={'request': request}
        )
        
        # Calculate avg completion time by frequency
        avg_completion_times = {}
        for freq in ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'biannually', 'annually']:
            tasks = completed_tasks.filter(frequency=freq)
            if tasks.count() > 0:
                # Calculate average days between scheduled and completed dates
                sum_days = 0
                count = 0
                for task in tasks:
                    if task.scheduled_date and task.completed_date:
                        diff = task.completed_date - task.scheduled_date
                        sum_days += diff.days
                        count += 1
                avg_completion_times[freq] = round(sum_days / count, 1) if count > 0 else 0
        
        # Prepare response data
        response_data = {
            'counts': {
                'total': total,
                'completed': completed,
                'pending': pending,
                'overdue': overdue
            },
            'frequency_distribution': frequency_distribution,
            'priority_distribution': priority_distribution,
            'completion_rate': round(completion_rate, 1),
            'avg_completion_times': avg_completion_times,
            'upcoming': upcoming_serializer.data
        }
        
        return Response(response_data)
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """
        Get upcoming preventive maintenance tasks
        Query params:
        - days: Number of days to look ahead (default: 30)
        - priority: Filter by priority (optional)
        """
        # Get days parameter (default to 30 days)
        days = int(request.query_params.get('days', 30))
        priority = request.query_params.get('priority', None)
        
        # Calculate date range
        now = timezone.now()
        end_date = now + timedelta(days=days)
        
        # Get upcoming maintenance tasks
        queryset = self.get_queryset().filter(
            completed_date__isnull=True,
            scheduled_date__gte=now,
            scheduled_date__lte=end_date
        )
        
        # Apply priority filter if provided
        if priority:
            queryset = queryset.filter(priority=priority)
        
        # Apply ordering
        queryset = queryset.order_by('scheduled_date')
        
        # Paginate results if needed
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = PreventiveMaintenanceListSerializer(
                page, 
                many=True,
                context={'request': request}
            )
            return self.get_paginated_response(serializer.data)
        
        # Serialize and return
        serializer = PreventiveMaintenanceListSerializer(
            queryset, 
            many=True,
            context={'request': request}
        )
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """
        Get overdue preventive maintenance tasks
        Query params:
        - priority: Filter by priority (optional)
        - sort_by: Sort by 'date' or 'overdue_days' (default: 'date')
        """
        # Get parameters
        priority = request.query_params.get('priority', None)
        sort_by = request.query_params.get('sort_by', 'date')
        
        # Get current date
        now = timezone.now()
        
        # Get overdue maintenance tasks
        queryset = self.get_queryset().filter(
            completed_date__isnull=True,
            scheduled_date__lt=now
        )
        
        # Apply priority filter if provided
        if priority:
            queryset = queryset.filter(priority=priority)
        
        # Apply sorting
        if sort_by == 'overdue_days':
            # Annotate with days overdue and sort by that
            queryset = queryset.annotate(
                days_overdue=ExpressionWrapper(
                    now - F('scheduled_date'),
                    output_field=fields.DurationField()
                )
            ).order_by('-days_overdue')
        else:
            # Default sort by scheduled date (oldest first)
            queryset = queryset.order_by('scheduled_date')
        
        # Paginate results if needed
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = PreventiveMaintenanceListSerializer(
                page, 
                many=True,
                context={'request': request}
            )
            return self.get_paginated_response(serializer.data)
        
        # Serialize and return
        serializer = PreventiveMaintenanceListSerializer(
            queryset, 
            many=True,
            context={'request': request}
        )
        
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pm_id=None):
        """
        Mark a preventive maintenance task as completed
        Request body should contain:
        - completed_date: Date of completion (default: current date)
        - notes: Optional notes
        - after_image: Optional image taken after maintenance
        """
        # Get the maintenance record
        instance = self.get_object()
        
        # Check if already completed
        if instance.completed_date:
            return Response(
                {'detail': 'This maintenance task is already completed.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # If no completed_date provided, use current date
        if 'completed_date' not in request.data:
            request.data['completed_date'] = timezone.now().isoformat()
        
        # Validate and save
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        # Calculate next_due_date based on frequency
        completed_date = serializer.validated_data.get('completed_date') or timezone.now()
        next_due_date = self._calculate_next_due_date(instance, completed_date)
        
        # Save with next_due_date and current user
        serializer.save(
            next_due_date=next_due_date,
            updated_by=request.user
        )
        
        # Return updated record
        return Response(
            PreventiveMaintenanceDetailSerializer(
                instance=serializer.instance,
                context={'request': request}
            ).data
        )
    
    def _calculate_next_due_date(self, instance, reference_date):
        """
        Calculate the next due date based on the maintenance frequency
        Args:
            instance: The maintenance instance
            reference_date: The date to calculate from (usually completed_date)
        Returns:
            datetime: The next due date
        """
        if instance.frequency == 'daily':
            return reference_date + timedelta(days=1)
        elif instance.frequency == 'weekly':
            return reference_date + timedelta(weeks=1)
        elif instance.frequency == 'biweekly':
            return reference_date + timedelta(weeks=2)
        elif instance.frequency == 'monthly':
            # Add one month (approximate)
            return reference_date + timedelta(days=30)
        elif instance.frequency == 'quarterly':
            return reference_date + timedelta(days=90)
        elif instance.frequency == 'biannually':
            return reference_date + timedelta(days=182)
        elif instance.frequency == 'annually':
            return reference_date + timedelta(days=365)
        elif instance.frequency == 'custom' and instance.custom_days:
            return reference_date + timedelta(days=instance.custom_days)
        else:
            # Default to monthly if frequency is invalid
            return reference_date + timedelta(days=30)
    
    @action(detail=True, methods=['post'])
  
    def upload_images(self, request, pm_id=None):
        """
        Upload images for a preventive maintenance task
        Request should contain either:
        - images and image_types fields (multiple images)
        OR
        - before_image and after_image fields (direct image fields)
        """
        instance = self.get_object()
        
        # Check for traditional images + image_types format
        if 'images' in request.FILES:
            # Get image types
            image_types = request.POST.getlist('image_types', [])
            if not image_types or len(image_types) != len(request.FILES.getlist('images')):
                return Response(
                    {'detail': 'Image types must be provided for each image.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Process each image
            images = request.FILES.getlist('images')
            updated = False
            
            for i, image in enumerate(images):
                image_type = image_types[i] if i < len(image_types) else None
                
                if image_type == 'before':
                    instance.before_image = image
                    updated = True
                elif image_type == 'after':
                    instance.after_image = image
                    updated = True
        
        # Check for direct before_image and after_image fields
        else:
            updated = False
            
            if 'before_image' in request.FILES:
                instance.before_image = request.FILES['before_image']
                updated = True
                
            if 'after_image' in request.FILES:
                instance.after_image = request.FILES['after_image']
                updated = True
                
            if not updated:
                return Response(
                    {'detail': 'No images provided. Use either "images" + "image_types" or "before_image"/"after_image" fields.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if updated:
            instance.save(update_fields=['before_image', 'after_image'])
            instance.updated_by = request.user
            instance.save(update_fields=['updated_by'])
        
        # Return updated record
        serializer = PreventiveMaintenanceDetailSerializer(
            instance=instance,
            context={'request': request}
        )
        
        return Response(serializer.data)
    @action(detail=True, methods=['post'])
    def reschedule(self, request, pm_id=None):
        """
        Reschedule a maintenance task
        Request body should contain:
        - scheduled_date: New scheduled date
        - reason: Optional reason for rescheduling
        """
        instance = self.get_object()
        
        # Check if already completed
        if instance.completed_date:
            return Response(
                {'detail': 'Cannot reschedule a completed task.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if scheduled_date is provided
        if 'scheduled_date' not in request.data:
            return Response(
                {'detail': 'Scheduled date must be provided.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update the scheduled date
        instance.scheduled_date = request.data['scheduled_date']
        
        # Add reason if provided
        if 'reason' in request.data:
            if not instance.notes:
                instance.notes = ""
            instance.notes += f"\n[{timezone.now().strftime('%Y-%m-%d %H:%M')}] Rescheduled: {request.data['reason']}"
        
        # Save changes
        instance.updated_by = request.user
        instance.save()
        
        # Return updated record
        serializer = PreventiveMaintenanceDetailSerializer(
            instance=instance,
            context={'request': request}
        )
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_priority(self, request):
        """
        Get maintenance tasks sorted by priority and status
        Returns tasks in the order: high-priority overdue, medium-priority overdue,
        low-priority overdue, high-priority upcoming, etc.
        """
        now = timezone.now()
        
        # Get priority parameter (optional)
        priority = request.query_params.get('priority', None)
        
        # Base queryset
        queryset = self.get_queryset()
        
        # Filter by priority if provided
        if priority:
            queryset = queryset.filter(priority=priority)
        
        # Categorize tasks
        overdue = queryset.filter(completed_date__isnull=True, scheduled_date__lt=now)
        upcoming = queryset.filter(completed_date__isnull=True, scheduled_date__gte=now)
        
        # Create priority lists
        priority_mapping = {
            'high': 1,
            'medium': 2,
            'low': 3
        }
        
        # Annotate with priority order and sort
        overdue = overdue.annotate(
            priority_order=Case(
                When(priority='high', then=Value(1)),
                When(priority='medium', then=Value(2)),
                When(priority='low', then=Value(3)),
                default=Value(4),
                output_field=fields.IntegerField()
            )
        ).order_by('priority_order', 'scheduled_date')
        
        upcoming = upcoming.annotate(
            priority_order=Case(
                When(priority='high', then=Value(1)),
                When(priority='medium', then=Value(2)),
                When(priority='low', then=Value(3)),
                default=Value(4),
                output_field=fields.IntegerField()
            )
        ).order_by('priority_order', 'scheduled_date')
        
        # Combine the querysets
        combined_queryset = list(overdue) + list(upcoming)
        
        # Paginate if needed
        page_size = int(request.query_params.get('page_size', 10))
        page = int(request.query_params.get('page', 1))
        
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_results = combined_queryset[start_idx:end_idx]
        
        # Serialize and return
        serializer = PreventiveMaintenanceListSerializer(
            paginated_results, 
            many=True,
            context={'request': request}
        )
        
        # Prepare pagination info
        total_items = len(combined_queryset)
        total_pages = math.ceil(total_items / page_size)
        
        response_data = {
            'count': total_items,
            'total_pages': total_pages,
            'current_page': page,
            'results': serializer.data
        }
        
        return Response(response_data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_preventive_maintenance_data(request):
    """Get statistics and overview of preventive maintenance"""
    
    # Get counts
    total_pm = PreventiveMaintenance.objects.count()
    completed_pm = PreventiveMaintenance.objects.filter(completed_date__isnull=False).count()
    pending_pm = PreventiveMaintenance.objects.filter(completed_date__isnull=True).count()
    overdue_pm = PreventiveMaintenance.objects.filter(
        scheduled_date__lt=timezone.now(),
        completed_date__isnull=True
    ).count()
    
    # Get frequency distribution
    frequency_counts = PreventiveMaintenance.objects.values('frequency').annotate(
        count=Count('frequency')
    ).order_by('frequency')
    
    # Get upcoming maintenance tasks (next 30 days)
    end_date = timezone.now() + timezone.timedelta(days=30)
    upcoming = PreventiveMaintenance.objects.filter(
        scheduled_date__lte=end_date,
        completed_date__isnull=True
    ).select_related('job').order_by('scheduled_date')[:5]
    
    upcoming_serialized = PreventiveMaintenanceListSerializer(
        upcoming, 
        many=True,
        context={'request': request}
    ).data
    
    return Response({
        'counts': {
            'total': total_pm,
            'completed': completed_pm,
            'pending': pending_pm,
            'overdue': overdue_pm
        },
        'frequency_distribution': list(frequency_counts),
        'upcoming': upcoming_serialized
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_preventive_maintenance_jobs(request):
    """Get jobs marked for preventive maintenance"""
    # Get query parameters
    property_id = request.query_params.get('property_id')
    status_param = request.query_params.get('status')
    limit = request.query_params.get('limit', 50)  # Default to 50 jobs
    
    # Build base query
    query = Job.objects.filter(is_preventivemaintenance=True)
    
    # Add property filter if provided
    if property_id:
        try:
            property_obj = get_object_or_404(Property, property_id=property_id)
            # Check user has access to this property
            if not property_obj.users.filter(id=request.user.id).exists():
                return Response(
                    {"detail": "You do not have permission to access this property"},
                    status=status.HTTP_403_FORBIDDEN
                )
            query = query.filter(rooms__properties=property_obj)
        except Property.DoesNotExist:
            return Response(
                {"detail": f"Property with ID {property_id} not found"},
                status=status.HTTP_404_NOT_FOUND
            )
    else:
        # If no property specified, filter by user's properties
        user_properties = Property.objects.filter(users=request.user)
        query = query.filter(rooms__properties__in=user_properties)
    
    # Add status filter if provided
    if status_param:
        query = query.filter(status=status_param)
    
    # Apply distinct, select related, and prefetch related for efficiency
    query = query.distinct().select_related('user').prefetch_related(
        'rooms', 'topics', 'job_images'
    )
    
    # Apply limit
    if limit and limit.isdigit():
        query = query[:int(limit)]
    
    # Serialize and return
    serializer = JobSerializer(query, many=True, context={'request': request})
    return Response({'jobs': serializer.data, 'count': len(serializer.data)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_preventive_maintenance_rooms(request):
    """Get rooms with preventive maintenance jobs"""
    
    # Get property_id from query params
    property_id = request.query_params.get('property_id')
    
    # Start with rooms that have PM jobs
    rooms_with_pm = Room.objects.filter(
        jobs__is_preventivemaintenance=True
    ).distinct()
    
    # Add property filter if provided
    if property_id:
        try:
            property_obj = get_object_or_404(Property, property_id=property_id)
            # Check user has access to this property
            if not property_obj.users.filter(id=request.user.id).exists():
                return Response(
                    {"detail": "You do not have permission to access this property"},
                    status=status.HTTP_403_FORBIDDEN
                )
            rooms_with_pm = rooms_with_pm.filter(properties=property_obj)
        except Property.DoesNotExist:
            return Response(
                {"detail": f"Property with ID {property_id} not found"},
                status=status.HTTP_404_NOT_FOUND
            )
    else:
        # If no property specified, filter by user's properties
        user_properties = Property.objects.filter(users=request.user)
        rooms_with_pm = rooms_with_pm.filter(properties__in=user_properties)
    
    # Serialize and return
    serializer = RoomSerializer(rooms_with_pm, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_preventive_maintenance_topics(request):
    """Get topics used in preventive maintenance jobs"""
    
    # Get user's properties
    user_properties = Property.objects.filter(users=request.user)
    
    # Get topics from PM jobs for user's properties
    topics = Topic.objects.filter(
        jobs__is_preventivemaintenance=True,
        jobs__rooms__properties__in=user_properties
    ).distinct()
    
    # Serialize and return
    serializer = TopicSerializer(topics, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def property_is_preventivemaintenance(request, property_id):
    """Check if a property has preventive maintenance jobs"""
    
    # Get the property
    property_instance = get_object_or_404(Property, property_id=property_id)
    
    # Check user has access to this property
    if not property_instance.users.filter(id=request.user.id).exists():
        if property_id != "PB749146D" or not settings.DEBUG:
            return Response(
                {"detail": "You do not have permission to access this property"},
                status=status.HTTP_403_FORBIDDEN
            )
    
    # Check if property has any PM jobs
    has_pm_jobs = Job.objects.filter(
        rooms__properties=property_instance,
        is_preventivemaintenance=True
    ).exists()
    
    # Update the property field
    if property_instance.is_preventivemaintenance != has_pm_jobs:
        property_instance.is_preventivemaintenance = has_pm_jobs
        property_instance.save()
    
    # Serialize and return
    serializer = PropertyPMStatusSerializer(property_instance)
    return Response(serializer.data)


class RoomViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Room.objects.all()
    serializer_class = RoomSerializer


class TopicViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Topic.objects.all()
    serializer_class = TopicSerializer


class JobViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Job.objects.all()
    serializer_class = JobSerializer
    lookup_field = 'job_id'

    def get_object(self):
        queryset = self.get_queryset()
        filter_kwargs = {self.lookup_field: self.kwargs[self.lookup_field]}
        obj = get_object_or_404(queryset, **filter_kwargs)
        self.check_object_permissions(self.request, obj)
        return obj

    @action(detail=True, methods=['patch'])
    def update_status(self, request, job_id=None):
        job = self.get_object()
        status_value = request.data.get('status')
        if status_value and status_value not in dict(Job.STATUS_CHOICES):
            return Response({"detail": "Invalid status value."}, status=status.HTTP_400_BAD_REQUEST)
        
        if request.user.is_authenticated:
            job.updated_by = request.user
        
        if status_value == 'completed' and job.status != 'completed':
            job.completed_at = timezone.now()
            
        job.status = status_value
        job.save()
        serializer = self.get_serializer(job)
        return Response(serializer.data)

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user, updated_by=self.request.user)
        else:
            serializer.save()

    def perform_update(self, serializer):
        if self.request.user.is_authenticated:
            instance = self.get_object()
            data = serializer.validated_data
            if 'status' in data and data['status'] == 'completed' and instance.status != 'completed':
                serializer.save(updated_by=self.request.user, completed_at=timezone.now())
            else:
                serializer.save(updated_by=self.request.user)
        else:
            serializer.save()


class UserProfileViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer

    def get_queryset(self):
        return UserProfile.objects.filter(user=self.request.user).prefetch_related('properties')

    @action(detail=False, methods=['get'])
    def me(self, request):
        profile = get_object_or_404(UserProfile, user=request.user)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_property(self, request, pk=None):
        profile = self.get_object()
        property_id = request.data.get('property_id')
        if not property_id:
            return Response({'error': 'property_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        property = get_object_or_404(Property, property_id=property_id)
        profile.properties.add(property)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def remove_property(self, request, pk=None):
        profile = self.get_object()
        property_id = request.data.get('property_id')
        if not property_id:
            return Response({'error': 'property_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        property = get_object_or_404(Property, property_id=property_id)
        profile.properties.remove(property)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)


class PropertyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Property.objects.all()
    serializer_class = PropertySerializer
    lookup_field = 'property_id'
    
    def get_queryset(self):
        logger.info(f"User {self.request.user.username} requesting properties")
        queryset = Property.objects.filter(users=self.request.user)
        logger.info(f"Found {queryset.count()} properties for user")
        return queryset
    
    def get_object(self):
        property_id = self.kwargs.get('property_id')
        logger.info(f"Looking up property with ID: {property_id}")
        
        # Try to find the property regardless of user association
        try:
            obj = Property.objects.get(property_id=property_id)
            logger.info(f"Found property: {obj.name}")
            
            # Check if this property is associated with the user
            if not obj.users.filter(id=self.request.user.id).exists():
                logger.warning(f"Property {property_id} exists but not associated with user {self.request.user.username}")
                
                # Special case for property PB749146D (if this is a test property)
                if property_id == "PB749146D" and settings.DEBUG:
                    logger.info(f"SPECIAL CASE: Allowing access to test property {property_id} in debug mode")
                    return obj
            
            # Still let the original get_object handle permissions
            return super().get_object()
        except Property.DoesNotExist:
            logger.error(f"Property with ID {property_id} not found in database")
            raise
    
    @action(detail=True, methods=['get'])
    def is_preventivemaintenance(self, request, property_id=None):
        logger.info(f"is_preventivemaintenance called for property_id: {property_id}")
        try:
            # Try direct lookup first
            try:
                property_obj = Property.objects.get(property_id=property_id)
                logger.info(f"Found property via direct lookup: {property_obj.name}")
                
                # Check if this user has permission for this property
                if not property_obj.users.filter(id=request.user.id).exists():
                    # Special case for property PB749146D
                    if property_id != "PB749146D" or not settings.DEBUG:
                        logger.warning(f"User {request.user.username} does not have permission for property {property_id}")
                        return Response(
                            {"detail": "You do not have permission to access this property"},
                            status=status.HTTP_403_FORBIDDEN
                        )
                    logger.info(f"Special case: Allowing access to {property_id} in DEBUG mode")
            except Property.DoesNotExist:
                # Fall back to get_object if direct lookup fails
                property_obj = self.get_object()
                logger.info(f"Found property via get_object: {property_obj.name}")
            
            # Check if there are any preventive maintenance jobs associated with this property
            has_pm_jobs = Job.objects.filter(
                rooms__properties=property_obj,  # Use consistent field name
                is_preventivemaintenance=True
            ).exists()
            
            logger.info(f"Property {property_id} has PM jobs: {has_pm_jobs}")
            
            return Response({
                'property_id': property_obj.property_id,
                'is_preventivemaintenance': has_pm_jobs
            })
        except Property.DoesNotExist:
            logger.error(f"Property {property_id} not found")
            return Response(
                {"detail": f"Property with ID {property_id} not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.exception(f"Error in is_preventivemaintenance for property {property_id}: {str(e)}")
            return Response(
                {"detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# Session Management Views for NextAuth
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = User.objects.filter(username=username).first()

        if user and user.check_password(password):
            refresh = RefreshToken.for_user(user)
            session = Session.objects.create(
                user=user,
                session_token=str(uuid.uuid4()),
                access_token=str(refresh.access_token),
                refresh_token=str(refresh),
                expires_at=timezone.now() + timedelta(days=30),
            )
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'session_token': session.session_token,
                'user_id': user.id,
            })
        return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        logger.debug(f"Register request payload: {request.data}")
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            session = Session.objects.create(
                user=user,
                session_token=str(uuid.uuid4()),
                access_token=str(refresh.access_token),
                refresh_token=str(refresh),
                expires_at=timezone.now() + timedelta(days=30),
            )
            response_data = {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'session_token': session.session_token,
                'user_id': user.id,
            }
            logger.info(f"User registered: {user.username} - Response: {response_data}")
            return Response(response_data, status=status.HTTP_201_CREATED)
        logger.warning(f"Registration failed: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        session_token = request.data.get('session_token')
        if session_token:
            Session.objects.filter(session_token=session_token, user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CustomSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        session = Session.objects.filter(user=request.user).first()
        if not session:
            return Response({'detail': 'No active session found'}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            'session_token': session.session_token,
            'access_token': session.access_token,
            'refresh_token': session.refresh_token,
            'expires_at': session.expires_at,
            'created_at': session.created_at,
        })

    def post(self, request):
        refresh = RefreshToken.for_user(request.user)
        session, created = Session.objects.update_or_create(
            user=request.user,
            defaults={
                'session_token': str(uuid.uuid4()),
                'access_token': str(refresh.access_token),
                'refresh_token': str(refresh),
                'expires_at': timezone.now() + timedelta(days=30),
            }
        )
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'session_token': session.session_token,
            'user_id': request.user.id,
        })


# Additional Views
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def auth_check(request):
    """Check if the user is authenticated and return basic user info."""
    return Response({
        "authenticated": True,
        "username": request.user.username,
        "email": request.user.email,
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def auth_providers(request):
    """Return a list of available authentication providers."""
    providers = {
        "google": {
            "name": "Google",
            "endpoint": "/api/v1/auth/google/",
            "description": "Sign in with Google OAuth2",
        },
        "local": {
            "name": "Local",
            "endpoint": "/api/auth/login/",
            "description": "Sign in with username and password",
        },
    }
    return Response(providers, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Handle user login and return JWT tokens."""
    username = request.data.get('username')
    password = request.data.get('password')
    user = User.objects.filter(username=username).first()

    if user and user.check_password(password):
        refresh = RefreshToken.for_user(user)
        session = Session.objects.create(
            user=user,
            session_token=str(uuid.uuid4()),
            access_token=str(refresh.access_token),
            refresh_token=str(refresh),
            expires_at=timezone.now() + timedelta(days=30),
        )
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'session_token': session.session_token,
            'user_id': user.id,
        })
    return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def log_view(request):
    """Simple view to log access and return a message."""
    logger.info(f"Log view accessed by user: {request.user.username}")
    return Response({"message": "This is a log view"}, status=status.HTTP_200_OK)


# Google Auth View
@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth(request):
    logger.info("google_auth view started")
    try:
        id_token_credential = request.data.get('id_token')
        access_token = request.data.get('access_token')

        if not id_token_credential:
            logger.warning("No ID token provided in request")
            return Response({'error': 'No ID token provided'}, status=status.HTTP_400_BAD_REQUEST)

        idinfo = id_token.verify_oauth2_token(id_token_credential, requests.Request(), settings.GOOGLE_CLIENT_ID)
        logger.info("Token verification successful")

        email = idinfo.get('email')
        google_id = idinfo.get('sub')

        if not email:
            logger.warning("Email not provided by Google in token")
            return Response({'error': 'Email not provided by Google'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            userprofile = UserProfile.objects.get(google_id=google_id)
            user = userprofile.user
        except UserProfile.DoesNotExist:
            try:
                user = User.objects.get(email=email)
                userprofile = user.userprofile
                userprofile.google_id = google_id
                userprofile.save()
            except User.DoesNotExist:
                username = email.split('@')[0]
                base_username = username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1
                user = User.objects.create(
                    username=username,
                    email=email,
                    is_active=True,
                    first_name=idinfo.get('given_name', ''),
                    last_name=idinfo.get('family_name', '')
                )
                userprofile = UserProfile.objects.create(user=user, google_id=google_id)

        userprofile.update_from_google_data(idinfo)
        userprofile.access_token = access_token
        userprofile.save()

        refresh = RefreshToken.for_user(user)
        session = Session.objects.create(
            user=user,
            session_token=str(uuid.uuid4()),
            access_token=str(refresh.access_token),
            refresh_token=str(refresh),
            expires_at=timezone.now() + timedelta(days=30),
        )

        response_data = {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'session_token': session.session_token,
            'user_id': user.id,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'profile_image': userprofile.profile_image.url if userprofile.profile_image else None,
                'positions': userprofile.positions,
                'properties': list(userprofile.properties.values('id', 'name', 'property_id')),
            }
        }
        logger.info(f"Response Data to Frontend: {json.dumps(response_data)}")
        return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Unexpected error in google_auth: {str(e)}")
        logger.exception(e)
        return Response({'error': 'Authentication failed', 'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Health Check
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "healthy"}, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_preventive_maintenance_data(request):
    """
    Get aggregated preventive maintenance data for all properties the user has access to.
    """
    logger.info(f"get_preventive_maintenance_data called by user: {request.user.username}")
    try:
        # Get properties accessible to the current user
        user_properties = Property.objects.filter(users=request.user)
        logger.info(f"Found {user_properties.count()} properties for user")
        
        # Get preventive maintenance jobs for these properties
        pm_jobs = Job.objects.filter(
            rooms__properties__in=user_properties,
            is_preventivemaintenance=True
        ).select_related('user').prefetch_related('rooms', 'topics')
        
        # Get counts by status
        status_counts = {
            'total': pm_jobs.count(),
            'pending': pm_jobs.filter(status='pending').count(),
            'in_progress': pm_jobs.filter(status='in_progress').count(),
            'completed': pm_jobs.filter(status='completed').count(),
            'waiting_sparepart': pm_jobs.filter(status='waiting_sparepart').count(),
            'cancelled': pm_jobs.filter(status='cancelled').count(),
        }
        
        # Calculate completion rate
        completion_rate = 0
        if status_counts['total'] > 0:
            completion_rate = (status_counts['completed'] / status_counts['total']) * 100
        
        # Return aggregated data
        return Response({
            'status_counts': status_counts,
            'completion_rate': completion_rate,
            'property_count': user_properties.count(),
        })
    except Exception as e:
        logger.exception(f"Error in get_preventive_maintenance_data: {str(e)}")
        return Response(
            {"detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    
    
    
       
class MaintenancePagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class PreventiveMaintenanceViewSet(viewsets.ModelViewSet):
    """
    API endpoints for managing preventive maintenance records.
    """
    serializer_class = PreventiveMaintenanceSerializer
    pagination_class = MaintenancePagination
    lookup_field = 'pm_id'
    
    def get_queryset(self):
        """
        Get the list of items with filtering.
        """
        # Start with all records
        queryset = PreventiveMaintenance.objects.all()
        
        # Apply filters based on query parameters
        pm_id = self.request.query_params.get('pm_id', None)
        status = self.request.query_params.get('status', None)
        topic_id = self.request.query_params.get('topic_id', None)
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        
        if pm_id:
            queryset = queryset.filter(pm_id__icontains=pm_id)
        if status == 'completed':
            queryset = queryset.filter(completed_date__isnull=False)
        elif status == 'pending':
            queryset = queryset.filter(completed_date__isnull=True)
        if topic_id:
            queryset = queryset.filter(topics__id=topic_id)
        if date_from:
            queryset = queryset.filter(scheduled_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(scheduled_date__lte=date_to)
        
        # Default ordering by scheduled date (newest first)
        return queryset.order_by('-scheduled_date')
    
    def list(self, request, *args, **kwargs):
        """
        Return a paginated list of preventive maintenance records with filter options.
        """
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response_data = self.get_paginated_response(serializer.data)
        else:
            serializer = self.get_serializer(queryset, many=True)
            response_data = Response(serializer.data)
        
        # Add topics for filter dropdowns
        topics = Topic.objects.all().order_by('title')
        topics_serializer = TopicSerializer(topics, many=True)
        
        # Enhance response with filter options
        response_data.data['topics'] = topics_serializer.data
        response_data.data['filters'] = {
            'pm_id': request.query_params.get('pm_id', ''),
            'status': request.query_params.get('status', ''),
            'topic_id': request.query_params.get('topic_id', ''),
            'date_from': request.query_params.get('date_from', ''),
            'date_to': request.query_params.get('date_to', '')
        }
        
        return response_data
    
    def retrieve(self, request, *args, **kwargs):
        """
        Return detailed information about a specific preventive maintenance record.
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        
        # Check if the PM is overdue
        is_overdue = False
        if not instance.completed_date and instance.scheduled_date < timezone.now():
            is_overdue = True
        
        # Enhanced response with overdue flag
        response_data = serializer.data
        response_data['is_overdue'] = is_overdue
        
        return Response(response_data)
    
    def create(self, request, *args, **kwargs):
        """
        Create a new preventive maintenance record.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Set created_by to current user
        pm = serializer.save(created_by=request.user)
        
        headers = self.get_success_headers(serializer.data)
        return Response(
            {"message": f"Preventive maintenance record {pm.pm_id} created successfully.", 
             "data": serializer.data}, 
            status=status.HTTP_201_CREATED, 
            headers=headers
        )
    
    def update(self, request, *args, **kwargs):
        """
        Update an existing preventive maintenance record.
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response({
            "message": f"Preventive maintenance record {instance.pm_id} updated successfully.",
            "data": serializer.data
        })
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete a preventive maintenance record.
        """
        instance = self.get_object()
        job_id = instance.job.job_id
        
        self.perform_destroy(instance)
        
        return Response({
            "message": "Preventive maintenance record deleted successfully.",
            "job_id": job_id
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def mark_complete(self, request, pm_id=None):
        """
        Mark a preventive maintenance as completed.
        """
        instance = self.get_object()
        
        # Set completed date to now if not already completed
        if not instance.completed_date:
            instance.completed_date = timezone.now()
            instance.save()
            message = "Preventive maintenance marked as completed."
            status_code = status.HTTP_200_OK
        else:
            message = "This maintenance was already marked as completed."
            status_code = status.HTTP_200_OK
        
        serializer = self.get_serializer(instance)
        return Response({
            "message": message,
            "data": serializer.data
        }, status=status_code)
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """
        Return a list of upcoming and overdue preventive maintenance tasks.
        """
        # Get upcoming maintenance tasks (scheduled in the future and not completed)
        upcoming = PreventiveMaintenance.objects.filter(
            scheduled_date__gte=timezone.now(),
            completed_date__isnull=True
        ).order_by('scheduled_date')
        
        # Get overdue maintenance tasks
        overdue = PreventiveMaintenance.objects.filter(
            scheduled_date__lt=timezone.now(),
            completed_date__isnull=True
        ).order_by('scheduled_date')
        
        upcoming_serializer = self.get_serializer(upcoming, many=True)
        overdue_serializer = self.get_serializer(overdue, many=True)
        
        return Response({
            "upcoming": upcoming_serializer.data,
            "overdue": overdue_serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def schedule(self, request):
        """
        Generate a schedule of upcoming maintenance tasks.
        """
        # Number of months to include in the schedule
        months = int(request.query_params.get('months', 3))
        
        # Calculate end date for schedule
        end_date = timezone.now() + timezone.timedelta(days=30 * months)
        
        # Get all maintenance tasks due within the specified period
        schedule = PreventiveMaintenance.objects.filter(
            Q(next_due_date__lte=end_date) | 
            Q(scheduled_date__lte=end_date, completed_date__isnull=True)
        ).order_by('scheduled_date', 'next_due_date')
        
        serializer = self.get_serializer(schedule, many=True)
        
        return Response({
            "schedule": serializer.data,
            "months": months,
            "end_date": end_date.isoformat()
        })
    
    @action(detail=False, methods=['get'])
    def calendar_data(self, request):
        """
        API endpoint to get maintenance data for calendar view.
        """
        # Get query parameters for time range
        start_date = request.query_params.get('start', '')
        end_date = request.query_params.get('end', '')
        
        # Get maintenance tasks in the specified range
        if start_date and end_date:
            tasks = PreventiveMaintenance.objects.filter(
                Q(scheduled_date__range=[start_date, end_date]) |
                Q(next_due_date__range=[start_date, end_date])
            )
        else:
            # Default to next 30 days if no range specified
            now = timezone.now()
            end = now + timezone.timedelta(days=30)
            tasks = PreventiveMaintenance.objects.filter(
                Q(scheduled_date__range=[now, end]) |
                Q(next_due_date__range=[now, end])
            )
        
        # Format data for calendar
        calendar_events = []
        for task in tasks:
            # Add scheduled date
            calendar_events.append({
                'id': task.pm_id,
                'title': f'PM: {task.job.job_id}',
                'start': task.scheduled_date.isoformat(),
                'url': f'/maintenance/{task.pm_id}',  # Frontend URL pattern
                'color': '#ff9f89' if not task.completed_date and task.scheduled_date < timezone.now() else '#4285F4'
            })
            
            # Add next due date if exists and different from scheduled date
            if task.next_due_date and task.next_due_date != task.scheduled_date:
                calendar_events.append({
                    'id': f"{task.pm_id}-next",
                    'title': f'Next PM: {task.job.job_id}',
                    'start': task.next_due_date.isoformat(),
                    'url': f'/maintenance/{task.pm_id}',  # Frontend URL pattern
                    'color': '#34A853'
                })
        
        return Response(calendar_events)
class PreventiveMaintenanceImageUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pm_id):
        try:
            pm = PreventiveMaintenance.objects.get(pm_id=pm_id)

            before_image = request.FILES.get('before_image')
            after_image = request.FILES.get('after_image')

            def process_image(image_file, filename_prefix):
                img = Image.open(image_file)
                img = img.convert('RGB')  # Ensure compatibility with WebP
                img.thumbnail((800, 800))  # Resize to fit within 800x800

                buffer = BytesIO()
                img.save(buffer, format='WEBP', quality=85)
                buffer.seek(0)

                return ContentFile(buffer.read(), name=f"{filename_prefix}.webp")

            if before_image:
                pm.before_image = process_image(before_image, "before_image")

            if after_image:
                pm.after_image = process_image(after_image, "after_image")

            pm.save()
            return Response({'message': 'Images uploaded and processed successfully'}, status=status.HTTP_200_OK)

        except PreventiveMaintenance.DoesNotExist:
            return Response({'error': 'PreventiveMaintenance not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
class MachineViewSet(viewsets.ModelViewSet):
    """ViewSet for handling Machine CRUD operations"""
    queryset = Machine.objects.all().select_related('property').prefetch_related(
        Prefetch('preventive_maintenances', queryset=PreventiveMaintenance.objects.all())
    )
    
    def get_serializer_class(self):
        """Return appropriate serializer class based on action"""
        if self.action == 'list':
            return MachineListSerializer
        elif self.action == 'create':
            return MachineCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return MachineUpdateSerializer
        elif self.action == 'associate_maintenances':
            return MachinePreventiveMaintenanceSerializer
        return MachineSerializer
    
    def list(self, request, *args, **kwargs):
        """List all machines with lighter serializer"""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve a single machine with detailed information"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """Create a new machine"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def update(self, request, *args, **kwargs):
        """Update an existing machine"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='associate-maintenances')
    def associate_maintenances(self, request, pk=None):
        """Associate preventive maintenances with a machine"""
        machine = self.get_object()
        serializer = self.get_serializer(machine, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'status': 'success',
            'message': 'Preventive maintenances associated successfully',
            'data': MachineDetailSerializer(machine).data
        }, status=status.HTTP_200_OK)
    """ViewSet for handling Machine CRUD operations"""
    queryset = Machine.objects.all().select_related('property').prefetch_related(
        Prefetch('preventive_maintenances', queryset=PreventiveMaintenance.objects.all())
    )
    
    def get_serializer_class(self):
        """Return appropriate serializer class based on action"""
        if self.action == 'list':
            return MachineListSerializer
        elif self.action == 'create':
            return MachineCreateSerializer  # Use new create serializer
        elif self.action in ['update', 'partial_update']:
            return MachineUpdateSerializer  # Use new update serializer
        elif self.action == 'associate_maintenances':
            return MachinePreventiveMaintenanceSerializer
        return MachineSerializer
    
    def list(self, request, *args, **kwargs):
        """List all machines with lighter serializer"""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve a single machine with detailed information"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """Create a new machine"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def update(self, request, *args, **kwargs):
        """Update an existing machine"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='associate-maintenances')
    def associate_maintenances(self, request, pk=None):
        """Associate preventive maintenances with a machine"""
        machine = self.get_object()
        serializer = self.get_serializer(machine, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'status': 'success',
            'message': 'Preventive maintenances associated successfully',
            'data': MachineDetailSerializer(machine).data
        }, status=status.HTTP_200_OK)
    """ViewSet for handling Machine CRUD operations"""
    queryset = Machine.objects.all().select_related('property').prefetch_related(
        Prefetch('preventive_maintenances', queryset=PreventiveMaintenance.objects.all())
    )
    
    def get_serializer_class(self):
        """Return appropriate serializer class based on action"""
        if self.action == 'list':
            return MachineListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return MachineCreateUpdateSerializer
        elif self.action == 'associate_maintenances':
            return MachinePreventiveMaintenanceSerializer
        return MachineSerializer
    
    def list(self, request, *args, **kwargs):
        """List all machines with lighter serializer"""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve a single machine with detailed information"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """Create a new machine"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def update(self, request, *args, **kwargs):
        """Update an existing machine"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='associate-maintenances')
    def associate_maintenances(self, request, pk=None):
        """Associate preventive maintenances with a machine"""
        machine = self.get_object()
        serializer = self.get_serializer(machine, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'status': 'success',
            'message': 'Preventive maintenances associated successfully',
            'data': MachineDetailSerializer(machine).data
        }, status=status.HTTP_200_OK)
    """ViewSet for handling Machine CRUD operations"""
    queryset = Machine.objects.all().select_related('property').prefetch_related(
        Prefetch('preventive_maintenances', queryset=PreventiveMaintenance.objects.all())
    )
    
    def get_serializer_class(self):
        """Return appropriate serializer class based on action"""
        if self.action == 'list':
            return MachineListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return MachineCreateUpdateSerializer
        elif self.action == 'associate_maintenances':
            return MachinePreventiveMaintenanceSerializer
        return MachineSerializer
    
    def list(self, request, *args, **kwargs):
        """List all machines with lighter serializer"""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve a single machine with detailed information"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """Create a new machine"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def update(self, request, *args, **kwargs):
        """Update an existing machine"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='associate-maintenances')
    def associate_maintenances(self, request, pk=None):
        """Associate preventive maintenances with a machine"""
        machine = self.get_object()
        serializer = self.get_serializer(machine, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'status': 'success',
            'message': 'Preventive maintenances associated successfully',
            'data': MachineDetailSerializer(machine).data
        }, status=status.HTTP_200_OK)
    """ViewSet for handling Machine CRUD operations"""
    queryset = Machine.objects.all().select_related('property').prefetch_related('preventive_maintenances')
    
    def get_serializer_class(self):
        """Return appropriate serializer class based on action"""
        if self.action == 'list':
            return MachineListSerializer
        elif self.action == 'create':
            return MachineCreateSerializer  # Use new create serializer
        elif self.action in ['update', 'partial_update']:
            return MachineUpdateSerializer  # Use update serializer
        elif self.action == 'associate_maintenances':
            return MachinePreventiveMaintenanceSerializer
        return MachineSerializer  # Use general-purpose serializer for retrieve
    
    def list(self, request, *args, **kwargs):
        """List all machines with lighter serializer"""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve a single machine with detailed information"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """Create a new machine"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def update(self, request, *args, **kwargs):
        """Update an existing machine"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='associate-maintenances')
    def associate_maintenances(self, request, pk=None):
        """Associate preventive maintenances with a machine"""
        machine = self.get_object()
        serializer = self.get_serializer(machine, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'status': 'success',
            'message': 'Preventive maintenances associated successfully',
            'data': MachineDetailSerializer(machine).data
        }, status=status.HTTP_200_OK)
    """ViewSet for handling Machine CRUD operations"""
    queryset = Machine.objects.all().select_related('property').prefetch_related('preventive_maintenances')
    
    def get_serializer_class(self):
        """Return appropriate serializer class based on action"""
        if self.action == 'list':
            return MachineListSerializer
        elif self.action == 'create':
            return MachineCreateUpdateSerializer
        elif self.action == 'update' or self.action == 'partial_update':
            return MachineUpdateSerializer  # Use the new serializer for updates
        elif self.action == 'associate_maintenances':
            return MachinePreventiveMaintenanceSerializer
        return MachineDetailSerializer
    
    # Rest of the ViewSet remains the same
    def list(self, request, *args, **kwargs):
        """List all machines with lighter serializer"""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve a single machine with detailed information"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """Create a new machine"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def update(self, request, *args, **kwargs):
        """Update an existing machine"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='associate-maintenances')
    def associate_maintenances(self, request, pk=None):
        """Associate preventive maintenances with a machine"""
        machine = self.get_object()
        serializer = self.get_serializer(machine, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'status': 'success',
            'message': 'Preventive maintenances associated successfully',
            'data': MachineDetailSerializer(machine).data
        }, status=status.HTTP_200_OK)
    """ViewSet for handling Machine CRUD operations"""
    queryset = Machine.objects.all().select_related('property').prefetch_related('preventive_maintenances')
    
    def get_serializer_class(self):
        """Return appropriate serializer class based on action"""
        if self.action == 'list':
            return MachineListSerializer
        elif self.action == 'create' or self.action == 'update' or self.action == 'partial_update':
            return MachineCreateUpdateSerializer
        elif self.action == 'associate_maintenances':
            return MachinePreventiveMaintenanceSerializer
        return MachineDetailSerializer
    
    def list(self, request, *args, **kwargs):
        """List all machines with lighter serializer"""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve a single machine with detailed information"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """Create a new machine"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def update(self, request, *args, **kwargs):
        """Update an existing machine"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='associate-maintenances')
    def associate_maintenances(self, request, pk=None):
        """Associate preventive maintenances with a machine"""
        machine = self.get_object()
        serializer = self.get_serializer(machine, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'status': 'success',
            'message': 'Preventive maintenances associated successfully',
            'data': MachineDetailSerializer(machine).data
        }, status=status.HTTP_200_OK)
    """
    API endpoint for managing machines.
    """
    queryset = Machine.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'property', 'location']
    search_fields = ['name', 'description', 'machine_id']
    ordering_fields = ['name', 'created_at', 'installation_date', 'last_maintenance_date']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return MachineCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return MachineUpdateSerializer
        return MachineSerializer
    
    def get_queryset(self):
        """
        This view should return a list of all machines.
        """
        # Start with base queryset with optimized preloading
        queryset = Machine.objects.select_related('property')
            
        # Apply explicit status filter
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        property_filter = self.request.query_params.get('property_id', None)
        if property_filter:
            queryset = queryset.filter(property_id=property_filter)
        
        # Search
        search_term = self.request.query_params.get('search', None)
        if search_term:
            queryset = queryset.filter(
                Q(name__icontains=search_term) | 
                Q(description__icontains=search_term) | 
                Q(machine_id__icontains=search_term)
            )
            
        return queryset.distinct()
    
    @action(detail=True, methods=['post'])
    def set_maintenance(self, request, pk=None):
        """Set the last maintenance date to current time."""
        machine = self.get_object()
        machine.last_maintenance_date = timezone.now()
        machine.save(update_fields=['last_maintenance_date', 'updated_at'])
        
        serializer = MachineSerializer(machine, context={'request': request})
        return Response({
            'status': 'maintenance date updated',
            'machine': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def change_status(self, request, pk=None):
        """Change the status of a machine."""
        machine = self.get_object()
        status_value = request.data.get('status')
        
        # Convert tuple-based choices to dict for lookup (Django 4 compatible)
        status_choices = dict(Machine.STATUS_CHOICES)
        
        if status_value not in status_choices:
            return Response(
                {
                    'error': f'Invalid status. Choose from {list(status_choices.keys())}',
                    'valid_statuses': status_choices
                },
                status=status.HTTP_400_BAD_REQUEST
            )
            
        machine.status = status_value
        machine.save(update_fields=['status', 'updated_at'])
        
        serializer = MachineSerializer(machine, context={'request': request})
        return Response({
            'status': f'Machine status changed to {status_value}',
            'machine': serializer.data
        })
        
    @action(detail=True, methods=['get'])
    def maintenance_history(self, request, pk=None):
        """Get history of completed maintenance for this machine."""
        machine = self.get_object()
        
        # Get the completed maintenances
        maintenances = machine.preventive_maintenances.filter(
            completed_date__isnull=False
        ).order_by('-completed_date')
        
        # Just return basic info about the maintenances
        data = [{
            'id': pm.id,
            'name': pm.name,
            'completed_date': pm.completed_date
        } for pm in maintenances]
        
        return Response(data)
    """
    API endpoint for managing machines.
    """
    queryset = Machine.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'property', 'location']
    search_fields = ['name', 'description', 'machine_id']
    ordering_fields = ['name', 'created_at', 'installation_date', 'last_maintenance_date']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return MachineListSerializer
        elif self.action == 'retrieve':
            return MachineDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return MachineCreateUpdateSerializer
        elif self.action == 'set_preventive_maintenances':
            return MachinePreventiveMaintenanceSerializer
        return MachineDetailSerializer
    
    def get_queryset(self):
        """
        This view should return a list of all machines 
        for the currently authenticated user.
        """
        # Start with base queryset with optimized preloading
        if self.action == 'list':
            queryset = Machine.objects.select_related('property')
        elif self.action == 'retrieve':
            # For detail view, prefetch related preventive maintenances
            queryset = Machine.objects.select_related('property').prefetch_related(
                Prefetch(
                    'preventive_maintenances',
                    queryset=PreventiveMaintenance.objects.order_by('next_due_date')
                )
            )
        else:
            queryset = Machine.objects.all()
            
        # Apply explicit status filter
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        property_filter = self.request.query_params.get('property_id', None)
        if property_filter:
            queryset = queryset.filter(property_id=property_filter)
        
        # Search (implemented here for clarity though it's handled by SearchFilter too)
        search_term = self.request.query_params.get('search', None)
        if search_term:
            queryset = queryset.filter(
                Q(name__icontains=search_term) | 
                Q(description__icontains=search_term) | 
                Q(machine_id__icontains=search_term)
            )
            
        return queryset.distinct()
    
    @action(detail=True, methods=['post'])
    def set_maintenance(self, request, pk=None):
        """Set the last maintenance date to current time."""
        machine = self.get_object()
        machine.last_maintenance_date = timezone.now()
        machine.save(update_fields=['last_maintenance_date', 'updated_at'])
        
        # Return updated serialized data
        serializer = MachineDetailSerializer(machine, context={'request': request})
        return Response({
            'status': 'maintenance date updated',
            'machine': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def change_status(self, request, pk=None):
        """Change the status of a machine."""
        machine = self.get_object()
        status_value = request.data.get('status')
        
        # Convert tuple-based choices to dict for lookup (Django 4 compatible)
        status_choices = dict(Machine.STATUS_CHOICES)
        
        if status_value not in status_choices:
            return Response(
                {
                    'error': f'Invalid status. Choose from {list(status_choices.keys())}',
                    'valid_statuses': status_choices
                },
                status=status.HTTP_400_BAD_REQUEST
            )
            
        machine.status = status_value
        machine.save(update_fields=['status', 'updated_at'])
        
        # Return updated serialized data
        serializer = MachineDetailSerializer(machine, context={'request': request})
        return Response({
            'status': f'Machine status changed to {status_value}',
            'machine': serializer.data
        })
        
    @action(detail=True, methods=['post'])
    def set_preventive_maintenances(self, request, pk=None):
        """Associate preventive maintenance schedules with the machine."""
        machine = self.get_object()
        serializer = self.get_serializer(machine, data=request.data)
        
        if serializer.is_valid():
            serializer.save()
            
            # Return updated machine with new preventive maintenances
            response_serializer = MachineDetailSerializer(machine, context={'request': request})
            return Response({
                'status': 'preventive maintenances updated',
                'machine': response_serializer.data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    @action(detail=True, methods=['get'])
    def maintenance_history(self, request, pk=None):
        """Get history of completed maintenance for this machine."""
        machine = self.get_object()
        
        # Use prefetch_related for optimal query performance
        maintenances = machine.preventive_maintenances.filter(
            completed_date__isnull=False
        ).order_by('-completed_date')
        
        from .serializers import PreventiveMaintenanceListSerializer
        serializer = PreventiveMaintenanceListSerializer(maintenances, many=True)
        return Response(serializer.data)
    """
    API endpoint for managing machines.
    """
    queryset = Machine.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'property', 'location']
    search_fields = ['name', 'description', 'machine_id']
    ordering_fields = ['name', 'created_at', 'installation_date', 'last_maintenance_date']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return MachineListSerializer
        elif self.action == 'retrieve':
            return MachineDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return MachineCreateUpdateSerializer
        elif self.action == 'set_preventive_maintenances':
            return MachinePreventiveMaintenanceSerializer
        return MachineDetailSerializer
    
    def get_queryset(self):
        """
        This view should return a list of all machines 
        for the currently authenticated user.
        """
        user = self.request.user
        
        # Start with base queryset with optimized preloading
        if self.action == 'list':
            queryset = Machine.objects.select_related('property')
        elif self.action == 'retrieve':
            # For detail view, prefetch related preventive maintenances
            queryset = Machine.objects.select_related('property').prefetch_related(
                Prefetch(
                    'preventive_maintenances',
                    queryset=PreventiveMaintenance.objects.order_by('next_due_date')
                )
            )
        else:
            queryset = Machine.objects.all()
        
        # Apply permission filters
        if not (user.is_staff or user.has_perm('machines.view_all_machines')):
            queryset = queryset.filter(property__managers=user)
            
        # Apply explicit status filter (works with Django 4's FilterBackend as well)
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        property_filter = self.request.query_params.get('property_id', None)
        if property_filter:
            queryset = queryset.filter(property_id=property_filter)
        
        # Search (implemented here for clarity though it's handled by SearchFilter too)
        search_term = self.request.query_params.get('search', None)
        if search_term:
            queryset = queryset.filter(
                Q(name__icontains=search_term) | 
                Q(description__icontains=search_term) | 
                Q(machine_id__icontains=search_term)
            )
            
        return queryset.distinct()
    
    @action(detail=True, methods=['post'])
    def set_maintenance(self, request, pk=None):
        """Set the last maintenance date to current time."""
        machine = self.get_object()
        machine.last_maintenance_date = timezone.now()
        machine.save(update_fields=['last_maintenance_date', 'updated_at'])
        
        # Return updated serialized data
        serializer = MachineDetailSerializer(machine, context={'request': request})
        return Response({
            'status': 'maintenance date updated',
            'machine': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def change_status(self, request, pk=None):
        """Change the status of a machine."""
        machine = self.get_object()
        status_value = request.data.get('status')
        
        # Convert tuple-based choices to dict for lookup (Django 4 compatible)
        status_choices = dict(Machine.STATUS_CHOICES)
        
        if status_value not in status_choices:
            return Response(
                {
                    'error': f'Invalid status. Choose from {list(status_choices.keys())}',
                    'valid_statuses': status_choices
                },
                status=status.HTTP_400_BAD_REQUEST
            )
            
        machine.status = status_value
        machine.save(update_fields=['status', 'updated_at'])
        
        # Return updated serialized data
        serializer = MachineDetailSerializer(machine, context={'request': request})
        return Response({
            'status': f'Machine status changed to {status_value}',
            'machine': serializer.data
        })
        
    @action(detail=True, methods=['post'])
    def set_preventive_maintenances(self, request, pk=None):
        """Associate preventive maintenance schedules with the machine."""
        machine = self.get_object()
        serializer = self.get_serializer(machine, data=request.data)
        
        if serializer.is_valid():
            serializer.save()
            
            # Return updated machine with new preventive maintenances
            response_serializer = MachineDetailSerializer(machine, context={'request': request})
            return Response({
                'status': 'preventive maintenances updated',
                'machine': response_serializer.data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    @action(detail=True, methods=['get'])
    def maintenance_history(self, request, pk=None):
        """Get history of completed maintenance for this machine."""
        machine = self.get_object()
        
        # Use prefetch_related for optimal query performance
        maintenances = machine.preventive_maintenances.filter(
            completed_date__isnull=False
        ).order_by('-completed_date')
        
        from .serializers import PreventiveMaintenanceListSerializer
        serializer = PreventiveMaintenanceListSerializer(maintenances, many=True)
        return Response(serializer.data)
    queryset = Machine.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'property', 'location']
    search_fields = ['name', 'description', 'machine_id']
    ordering_fields = ['name', 'created_at', 'installation_date', 'last_maintenance_date']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return MachineCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return MachineUpdateSerializer
        return MachineSerializer
    
    def get_queryset(self):
        user = self.request.user
        # If user has admin permissions, return all machines
        if user.is_staff or user.has_perm('machines.view_all_machines'):
            return Machine.objects.all()
        # Otherwise, only return machines from properties user has access to
        return Machine.objects.filter(property__managers=user)
    
    @action(detail=True, methods=['post'])
    def set_maintenance(self, request, pk=None):
        machine = self.get_object()
        machine.last_maintenance_date = timezone.now()
        machine.save()
        return Response({'status': 'maintenance date updated'})
    
    @action(detail=True, methods=['post'])
    def change_status(self, request, pk=None):
        machine = self.get_object()
        status_value = request.data.get('status')
        
        if status_value not in dict(Machine.STATUS_CHOICES):
            return Response(
                {'error': f'Invalid status. Choose from {dict(Machine.STATUS_CHOICES).keys()}'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        machine.status = status_value
        machine.save()
        return Response({'status': f'Machine status changed to {status_value}'})