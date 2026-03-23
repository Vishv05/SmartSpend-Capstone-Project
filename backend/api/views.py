"""
SmartSpend API - Views
Django REST Framework viewsets and endpoints
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.response import Response
from django.db.models import Sum, Avg, Count
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from decimal import Decimal

from .models import User, Category, Expense, ExpenseComment, FinancialGoal, InsightFeedback, Budget, NotificationLog, ExpenseDraft, AdminSetting
from .mongo import get_mongo_client
from .defaults import ensure_default_categories
from .insights import (
    answer_natural_language_question,
    build_admin_summary,
    build_drift_metrics,
    compute_anomalies,
    compute_forecast,
    compute_health_score,
    detect_recurring_transactions,
    generate_coaching_actions,
    project_goals,
    run_what_if_simulation,
    to_expense_rows,
)
from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    CategorySerializer,
    ExpenseSerializer,
    ExpenseCreateSerializer,
    ExpenseApprovalSerializer,
    ExpenseCommentSerializer,
    ExpenseAnalyticsSerializer,
    BudgetSerializer,
    NotificationLogSerializer,
    ExpenseDraftSerializer,
    AdminSettingSerializer
)


class UserViewSet(viewsets.ModelViewSet):
    """User management - Admin only"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Admin/Staff users see all users
        Regular users see only themselves
        """
        user = self.request.user
        
        # Check if user is authenticated
        if not user.is_authenticated:
            return User.objects.none()
        
        # Admin and staff can see all users
        if user.is_staff or user.role == 'admin':
            return User.objects.all()
        
        # Regular users see only themselves
        return User.objects.filter(id=user.id)

    def get_serializer_class(self):
        if self.action == 'create':
            return UserRegistrationSerializer
        return UserSerializer


DEFAULT_CATEGORIES = [
    {
        "name": "Travel",
        "description": "Flight, train, taxi",
        "icon": "travel",
    },
    {
        "name": "Meals",
        "description": "Food and beverages",
        "icon": "meals",
    },
    {
        "name": "Accommodation",
        "description": "Hotel, lodging",
        "icon": "hotel",
    },
    {
        "name": "Transportation",
        "description": "Uber, taxi, parking",
        "icon": "transport",
    },
    {
        "name": "Office Supplies",
        "description": "Stationery, equipment",
        "icon": "office",
    },
    {
        "name": "Software",
        "description": "Subscriptions, licenses",
        "icon": "software",
    },
    {
        "name": "Training",
        "description": "Courses, conferences",
        "icon": "training",
    },
]


class CategoryViewSet(viewsets.ModelViewSet):
    """Expense categories"""
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def list(self, request, *args, **kwargs):
        if not Category.objects.exists():
            for category in DEFAULT_CATEGORIES:
                Category.objects.get_or_create(
                    name=category["name"],
                    defaults={
                        "description": category["description"],
                        "icon": category["icon"],
                    },
                )
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        if not Category.objects.exists():
            defaults = [
                {"name": "Travel", "description": "Flight, train, taxi", "icon": "travel"},
                {"name": "Meals", "description": "Food and beverages", "icon": "meals"},
                {"name": "Accommodation", "description": "Hotel, lodging", "icon": "hotel"},
                {"name": "Transportation", "description": "Uber, taxi, parking", "icon": "transport"},
                {"name": "Office Supplies", "description": "Stationery, equipment", "icon": "office"},
                {"name": "Software", "description": "Subscriptions, licenses", "icon": "software"},
                {"name": "Training", "description": "Courses, conferences", "icon": "training"},
            ]
            for category in defaults:
                Category.objects.get_or_create(
                    name=category["name"],
                    defaults={
                        "description": category["description"],
                        "icon": category["icon"],
                    },
                )
        return Category.objects.filter(is_active=True)

    def list(self, request, *args, **kwargs):
        ensure_default_categories()
        return super().list(request, *args, **kwargs)


class ExpenseViewSet(viewsets.ModelViewSet):
    """Expense CRUD and analytics"""
    queryset = Expense.objects.select_related('user', 'category', 'approved_by')
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        """
        Admin/Staff users see all expenses
        Regular users see only their own expenses
        """
        user = self.request.user
        
        # Check if user is authenticated
        if not user.is_authenticated:
            return Expense.objects.none()
        
        # Admin and staff can see all expenses
        if user.is_staff or user.role == 'admin':
            return Expense.objects.select_related('user', 'category', 'approved_by').all()
        
        # Regular users see only their own expenses
        return Expense.objects.filter(user=user).select_related('user', 'category', 'approved_by')

    def get_serializer_class(self):
        if self.action == 'create':
            return ExpenseCreateSerializer
        return ExpenseSerializer

    def perform_create(self, serializer):
        admin_settings = AdminSetting.get_settings()
        amount = serializer.validated_data.get('amount') or Decimal('0')
        receipt = serializer.validated_data.get('receipt_file')

        if amount > admin_settings.require_receipt_above and not receipt:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'receipt_file': 'Receipt is required for amounts above configured threshold.'})

        expense = serializer.save(user=self.request.user)

        if admin_settings.auto_approve_limit and amount <= admin_settings.auto_approve_limit:
            expense.status = 'approved'
            expense.approved_by = self.request.user
            expense.approved_at = timezone.now()
            expense.rejection_reason = ''
            expense.save(update_fields=['status', 'approved_by', 'approved_at', 'rejection_reason', 'updated_at'])

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve or reject an expense"""
        expense = self.get_object()
        serializer = ExpenseApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        status_value = serializer.validated_data['status']
        rejection_reason = serializer.validated_data.get('rejection_reason', '')

        expense.status = status_value
        expense.approved_by = request.user
        expense.approved_at = timezone.now()
        expense.rejection_reason = rejection_reason
        expense.save()

        return Response(ExpenseSerializer(expense).data)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def analytics(self, request):
        """Dashboard analytics for expenses"""
        queryset = self.get_queryset()

        total_expenses = queryset.count()
        total_amount = queryset.aggregate(Sum('amount'))['amount__sum'] or 0
        avg_amount = queryset.aggregate(Avg('amount'))['amount__avg'] or 0

        status_counts = queryset.values('status').annotate(count=Count('id'))
        status_map = {item['status']: item['count'] for item in status_counts}

        category_breakdown = (
            queryset.values('category__name')
            .annotate(total=Sum('amount'))
            .order_by('-total')
        )
        category_data = {item['category__name']: float(item['total']) for item in category_breakdown}

        analytics_data = {
            'total_expenses': total_expenses,
            'total_amount': total_amount,
            'approved_count': status_map.get('approved', 0),
            'pending_count': status_map.get('pending', 0),
            'rejected_count': status_map.get('rejected', 0),
            'average_amount': avg_amount,
            'category_breakdown': category_data,
            'monthly_trend': []
        }

        serializer = ExpenseAnalyticsSerializer(analytics_data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def ai_suggestions(self, request):
        """Generate dynamic spend suggestions using tiered confidence by expense count."""
        user_expenses = self.get_queryset().select_related('category').order_by('-expense_date', '-submitted_at')

        total_count = user_expenses.count()
        if total_count <= 1:
            return Response(
                {
                    'eligible': False,
                    'tier': 'none',
                    'minimum_required': 2,
                    'current_count': total_count,
                    'message': 'Add at least one more expense to unlock early insights.',
                    'suggestions': [],
                }
            )

        all_user_expenses = list(user_expenses)
        is_early_insights = 2 <= total_count <= 3
        recent_window = 3 if is_early_insights else 4
        recent_expenses = list(user_expenses[:recent_window])
        confidence = 'low' if is_early_insights else 'high'
        suggestion_tier = 'early_insights' if is_early_insights else 'full_ai'

        recent_total = sum((expense.amount or Decimal('0')) for expense in recent_expenses)
        historical_total = sum((expense.amount or Decimal('0')) for expense in all_user_expenses)
        historical_avg = (historical_total / Decimal(len(all_user_expenses))) if all_user_expenses else Decimal('0')

        category_totals = {}
        for expense in all_user_expenses:
            category_name = expense.category.name if expense.category else 'Uncategorized'
            category_totals[category_name] = category_totals.get(category_name, Decimal('0')) + (expense.amount or Decimal('0'))

        sorted_categories = sorted(category_totals.items(), key=lambda item: item[1], reverse=True)
        top_category_name, top_category_total = sorted_categories[0]
        top_category_share = float((top_category_total / historical_total) * 100) if historical_total else 0.0

        recent_avg = recent_total / Decimal(len(recent_expenses))
        trend_change_pct = float(((recent_avg - historical_avg) / historical_avg) * 100) if historical_avg > 0 else 0.0

        suggestions = []
        suggestions.append(
            {
                'title': 'Category concentration insight' if not is_early_insights else 'Early category signal',
                'priority': 'high' if (top_category_share >= 40 and not is_early_insights) else 'medium',
                'confidence': confidence,
                'category': top_category_name,
                'message': (
                    f"{top_category_name} contributes {top_category_share:.1f}% of your total spend "
                    f"({float(top_category_total):.2f}). Reducing this category by 10% may save "
                    f"{float(top_category_total * Decimal('0.10')):.2f}."
                ),
                'metrics': {
                    'top_category_share_percent': round(top_category_share, 2),
                    'top_category_total': float(top_category_total),
                    'suggested_reduction_percent': 10,
                    'estimated_savings': float(top_category_total * Decimal('0.10')),
                },
            }
        )

        if not is_early_insights and trend_change_pct >= 15:
            suggestions.append(
                {
                    'title': 'Recent spend acceleration',
                    'priority': 'high',
                    'confidence': confidence,
                    'category': top_category_name,
                    'message': (
                        f"Your recent average expense ({float(recent_avg):.2f}) is {trend_change_pct:.1f}% higher "
                        f"than your historical average ({float(historical_avg):.2f}). Consider delaying non-urgent "
                        f"purchases this week."
                    ),
                    'metrics': {
                        'recent_average': float(recent_avg),
                        'historical_average': float(historical_avg),
                        'increase_percent': round(trend_change_pct, 2),
                    },
                }
            )
        elif not is_early_insights and trend_change_pct <= -10:
            suggestions.append(
                {
                    'title': 'Spend efficiency improvement',
                    'priority': 'low',
                    'confidence': confidence,
                    'category': top_category_name,
                    'message': (
                        f"Your recent average expense ({float(recent_avg):.2f}) is {abs(trend_change_pct):.1f}% lower "
                        f"than your historical average ({float(historical_avg):.2f}). Keep this pattern for stronger "
                        f"month-end control."
                    ),
                    'metrics': {
                        'recent_average': float(recent_avg),
                        'historical_average': float(historical_avg),
                        'decrease_percent': round(abs(trend_change_pct), 2),
                    },
                }
            )

        highest_expense = max(all_user_expenses, key=lambda expense: expense.amount or Decimal('0'))
        highest_category_name = highest_expense.category.name if highest_expense.category else 'Uncategorized'
        suggestions.append(
            {
                'title': 'Largest single expense check' if not is_early_insights else 'Early spending cap suggestion',
                'priority': 'medium',
                'confidence': confidence,
                'category': highest_category_name,
                'message': (
                    f"Your largest expense is {float(highest_expense.amount or 0):.2f} in {highest_category_name}. "
                    f"For similar future entries, setting a pre-approval cap at "
                    f"{float((highest_expense.amount or Decimal('0')) * Decimal('0.85')):.2f} can reduce spikes."
                ),
                'metrics': {
                    'largest_expense_amount': float(highest_expense.amount or 0),
                    'largest_expense_category': highest_category_name,
                    'suggested_cap': float((highest_expense.amount or Decimal('0')) * Decimal('0.85')),
                },
            }
        )

        # Category Spending Guidance (only for full AI insights)
        category_guidance = []
        if not is_early_insights and len(category_totals) > 1:
            total_categories = len(category_totals)
            avg_per_category = historical_total / Decimal(total_categories) if total_categories > 0 else Decimal('0')
            
            for cat_name, cat_total in sorted_categories:
                cat_share_pct = float((cat_total / historical_total) * 100) if historical_total else 0.0
                deviation_pct = float(((cat_total - avg_per_category) / avg_per_category) * 100) if avg_per_category > 0 else 0.0
                
                if deviation_pct > 30:  # Overspending
                    category_guidance.append({
                        'category': cat_name,
                        'status': 'overspending',
                        'icon': '🔴',
                        'total': float(cat_total),
                        'share_percent': round(cat_share_pct, 1),
                        'deviation_percent': round(deviation_pct, 1),
                        'recommendation': f"Reduce spending in {cat_name} by 15-20%",
                        'target_amount': float(cat_total * Decimal('0.85')),
                        'potential_savings': float(cat_total * Decimal('0.15')),
                    })
                elif deviation_pct < -20:  # Underspending
                    category_guidance.append({
                        'category': cat_name,
                        'status': 'underspending',
                        'icon': '🟢',
                        'total': float(cat_total),
                        'share_percent': round(cat_share_pct, 1),
                        'deviation_percent': round(abs(deviation_pct), 1),
                        'recommendation': f"You can allocate more to {cat_name} if needed",
                        'available_budget': float(avg_per_category - cat_total),
                    })
                else:  # Balanced
                    category_guidance.append({
                        'category': cat_name,
                        'status': 'balanced',
                        'icon': '🟡',
                        'total': float(cat_total),
                        'share_percent': round(cat_share_pct, 1),
                        'deviation_percent': round(abs(deviation_pct), 1),
                        'recommendation': f"{cat_name} spending is well-balanced",
                    })

        return Response(
            {
                'eligible': True,
                'tier': suggestion_tier,
                'confidence': confidence,
                'minimum_required': 2,
                'current_count': total_count,
                'message': (
                    f"Generated {len(suggestions)} {'early insight(s)' if is_early_insights else 'AI suggestion(s)'} "
                    f"from your expense pattern."
                ),
                'suggestions': suggestions,
                'category_guidance': category_guidance,
            }
        )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def ai_anomalies(self, request):
        rows = to_expense_rows(self.get_queryset().select_related('category'))
        anomalies = compute_anomalies(rows)
        return Response(
            {
                'count': len(anomalies),
                'items': anomalies,
                'explainability': 'Scores are based on category baseline mean and standard deviation over recent history.',
            }
        )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def ai_recurring(self, request):
        rows = to_expense_rows(self.get_queryset().select_related('category'))
        recurring = detect_recurring_transactions(rows)
        return Response(
            {
                'count': len(recurring),
                'items': recurring,
                'safety': 'Recurring suggestions are advisory only and require user confirmation for any action.',
            }
        )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def ai_forecast(self, request):
        rows = to_expense_rows(self.get_queryset().select_related('category'))
        return Response(compute_forecast(rows))

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def ai_health_score(self, request):
        rows = to_expense_rows(self.get_queryset().select_related('category'))
        anomalies = compute_anomalies(rows)
        return Response(compute_health_score(rows, anomalies))

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def ai_coach(self, request):
        rows = to_expense_rows(self.get_queryset().select_related('category'))
        anomalies = compute_anomalies(rows)
        forecast = compute_forecast(rows)
        health_score = compute_health_score(rows, anomalies)
        return Response(generate_coaching_actions(rows, forecast, anomalies, health_score))

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def ai_what_if(self, request):
        category_name = request.data.get('category') or request.data.get('category_name')
        if not category_name:
            return Response({'detail': 'category is required'}, status=status.HTTP_400_BAD_REQUEST)

        reduction_percent = float(request.data.get('reduction_percent', 10))
        goal_amount = request.data.get('goal_amount')
        goal_amount = float(goal_amount) if goal_amount not in [None, ''] else None

        rows = to_expense_rows(self.get_queryset().select_related('category'))
        simulation = run_what_if_simulation(rows, category_name, reduction_percent, goal_amount)
        return Response(simulation)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def ai_query(self, request):
        question = request.data.get('question', '')
        rows = to_expense_rows(self.get_queryset().select_related('category'))
        anomalies = compute_anomalies(rows)
        recurring = detect_recurring_transactions(rows)
        forecast = compute_forecast(rows)
        answer = answer_natural_language_question(question, rows, forecast, anomalies, recurring)
        return Response(
            {
                'question': question,
                'answer': answer.get('answer'),
                'insight_cards': answer.get('insight_cards', []),
            }
        )

    @action(detail=False, methods=['get', 'post'], permission_classes=[IsAuthenticated])
    def ai_goals(self, request):
        if request.method == 'POST':
            name = (request.data.get('name') or '').strip()
            target_amount = request.data.get('target_amount')
            monthly_target = request.data.get('monthly_target')
            target_date = request.data.get('target_date')

            if not name or target_amount in [None, '']:
                return Response(
                    {'detail': 'name and target_amount are required'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            goal = FinancialGoal.objects.create(
                user=request.user,
                name=name,
                target_amount=target_amount,
                monthly_target=monthly_target if monthly_target not in [None, ''] else None,
                target_date=target_date if target_date not in [None, ''] else None,
            )
            return Response(
                {
                    'id': goal.id,
                    'name': goal.name,
                    'target_amount': float(goal.target_amount),
                    'monthly_target': float(goal.monthly_target) if goal.monthly_target else None,
                    'target_date': goal.target_date.isoformat() if goal.target_date else None,
                    'is_active': goal.is_active,
                },
                status=status.HTTP_201_CREATED,
            )

        goals = FinancialGoal.objects.filter(user=request.user, is_active=True).order_by('-created_at')
        rows = to_expense_rows(self.get_queryset().select_related('category'))
        projections = project_goals(rows, goals)
        return Response({'count': len(projections), 'items': projections})

    @action(detail=False, methods=['patch'], permission_classes=[IsAuthenticated])
    def ai_goal_update(self, request):
        goal_id = request.data.get('id')
        if not goal_id:
            return Response({'detail': 'id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            goal = FinancialGoal.objects.get(id=goal_id, user=request.user)
        except FinancialGoal.DoesNotExist:
            return Response({'detail': 'goal not found'}, status=status.HTTP_404_NOT_FOUND)

        if 'name' in request.data:
            goal.name = request.data.get('name')
        if 'target_amount' in request.data:
            goal.target_amount = request.data.get('target_amount')
        if 'monthly_target' in request.data:
            value = request.data.get('monthly_target')
            goal.monthly_target = value if value not in [None, ''] else None
        if 'target_date' in request.data:
            value = request.data.get('target_date')
            goal.target_date = value if value not in [None, ''] else None
        if 'is_active' in request.data:
            goal.is_active = bool(request.data.get('is_active'))

        goal.save()
        return Response({'detail': 'goal updated'})

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def ai_feedback(self, request):
        insight_type = (request.data.get('insight_type') or '').strip()
        insight_key = (request.data.get('insight_key') or '').strip()
        if not insight_type or not insight_key:
            return Response(
                {'detail': 'insight_type and insight_key are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        expense = None
        expense_id = request.data.get('expense_id')
        if expense_id not in [None, '']:
            expense = Expense.objects.filter(id=expense_id).first()

        feedback = InsightFeedback.objects.create(
            user=request.user,
            expense=expense,
            insight_type=insight_type,
            insight_key=insight_key,
            is_useful=request.data.get('is_useful'),
            corrected_value=request.data.get('corrected_value') if isinstance(request.data.get('corrected_value'), dict) else None,
            comment=(request.data.get('comment') or '').strip(),
        )
        return Response({'id': feedback.id, 'detail': 'feedback_saved'}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def ai_drift(self, request):
        if not (request.user.is_staff or request.user.role == 'admin'):
            return Response({'detail': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        feedback_rows = InsightFeedback.objects.all().order_by('-created_at')[:200]
        drift = build_drift_metrics(list(feedback_rows))
        return Response(drift)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def ai_admin_summary(self, request):
        if not (request.user.is_staff or request.user.role == 'admin'):
            return Response({'detail': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        all_rows = to_expense_rows(Expense.objects.select_related('category').all())
        anomalies = compute_anomalies(all_rows)
        return Response(build_admin_summary(all_rows, anomalies))

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def suggest_category(self, request):
        """
        AI-powered category suggestion based on expense description
        POST /api/expenses/suggest_category/
        Body: {"description": "Lunch at restaurant"}
        Returns: [{"category_id": 1, "category_name": "Meals", "confidence": 85.5}, ...]
        """
        from .ml_categorizer import get_predictor
        
        description = request.data.get('description', '').strip()
        if not description:
            return Response(
                {'detail': 'Description is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get ML predictor and train if needed
        predictor = get_predictor()
        
        # Get predictions
        predictions = predictor.predict(description, top_n=3)
        
        if not predictions:
            return Response(
                {
                    'predictions': [],
                    'message': 'Not enough training data. Model will improve as more expenses are added.',
                    'trained': predictor.is_trained
                }
            )
        
        return Response({
            'predictions': predictions,
            'description': description,
            'trained': predictor.is_trained
        })


class ExpenseCommentViewSet(viewsets.ModelViewSet):
    """Expense comments"""
    queryset = ExpenseComment.objects.select_related('expense', 'user')
    serializer_class = ExpenseCommentSerializer
    permission_classes = [IsAuthenticated]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mongo_health(request):
    """Check MongoDB connection health."""
    try:
        client = get_mongo_client()
        client.admin.command('ping')
        return Response({'status': 'ok'})
    except Exception as exc:
        return Response({'status': 'error', 'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


class BudgetViewSet(viewsets.ModelViewSet):
    """Budget management - Admin only"""
    queryset = Budget.objects.all()
    serializer_class = BudgetSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Only admins can manage budgets"""
        if self.request.user.is_staff or self.request.user.role == 'admin':
            return Budget.objects.all()
        # Managers can see budgets for their department
        return Budget.objects.filter(department=self.request.user.department)
    
    @action(detail=False, methods=['get'])
    def budget_status(self, request):
        """Get budget status with spending summary"""
        from datetime import date
        from .email_notifications import notify_budget_alert
        
        today = date.today()
        
        admin_settings = AdminSetting.get_settings()

        # Get active budgets
        budgets = self.get_queryset().filter(
            is_active=True,
            start_date__lte=today,
            end_date__gte=today
        )
        
        result = []
        for budget in budgets:
            # Calculate spending
            spent = Expense.objects.filter(
                category=budget.category,
                expense_date__gte=budget.start_date,
                expense_date__lte=budget.end_date,
                status='approved'
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            remaining = budget.amount - spent
            percentage = float((spent / budget.amount * 100) if budget.amount > 0 else 0)
            threshold = admin_settings.budget_alert_threshold or budget.alert_threshold
            alert_status = 'alert' if percentage >= threshold else 'ok'

            if alert_status == 'alert':
                recipient_ids = set(
                    User.objects.filter(role='admin', is_staff=True).values_list('id', flat=True)
                )
                recipient_ids.update(
                    User.objects.filter(role='manager', department=budget.department).values_list('id', flat=True)
                )

                recipients = User.objects.filter(id__in=recipient_ids).exclude(email='')
                category_name = budget.category.name if budget.category else 'All Categories'
                dedupe_subject = f"Budget Alert: {budget.department} - {category_name}"

                for recipient in recipients:
                    already_sent_today = NotificationLog.objects.filter(
                        user=recipient,
                        notification_type='budget_alert',
                        subject=dedupe_subject,
                        created_at__date=today,
                    ).exists()
                    if not already_sent_today and admin_settings.email_notifications:
                        notify_budget_alert(recipient, budget, spent, round(percentage, 2))
            
            result.append({
                'id': budget.id,
                'department': budget.department,
                'category': budget.category.name if budget.category else 'All Categories',
                'budget_amount': str(budget.amount),
                'spent': str(spent),
                'remaining': str(remaining),
                'percentage': round(percentage, 2),
                'alert_status': alert_status,
                'threshold': threshold,
                'period': budget.period,
                'start_date': budget.start_date,
                'end_date': budget.end_date,
            })
        
        return Response(result)


class NotificationLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Notification logs - View only"""
    queryset = NotificationLog.objects.all()
    serializer_class = NotificationLogSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Users see their own notifications, admins see all"""
        if self.request.user.is_staff or self.request.user.role == 'admin':
            return NotificationLog.objects.all()
        return NotificationLog.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def unsent(self, request):
        """Get unsent notifications (for admin monitoring)"""
        if not (request.user.is_staff or request.user.role == 'admin'):
            return Response({'detail': 'Not allowed'}, status=status.HTTP_403_FORBIDDEN)
        
        unsent = NotificationLog.objects.filter(is_sent=False)
        serializer = self.get_serializer(unsent, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_notifications(self, request):
        """Get current user's notifications"""
        notifications = NotificationLog.objects.filter(user=request.user).order_by('-created_at')[:20]
        serializer = self.get_serializer(notifications, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def admin_summary(self, request):
        """Get admin notification summary - pending approvals and recent alerts"""
        if not (request.user.is_staff or request.user.role == 'admin'):
            return Response({'detail': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get pending expense approvals
        pending_expenses = Expense.objects.filter(status='pending').select_related('user', 'user__manager', 'category')
        
        # Get recent budget alerts (last 7 days)
        from datetime import timedelta
        week_ago = timezone.now() - timedelta(days=7)
        recent_alerts = NotificationLog.objects.filter(
            notification_type__in=['budget_alert', 'budget_exceeded'],
            created_at__gte=week_ago
        ).select_related('user', 'expense')
        
        # Get recent expense submissions (last 24 hours)
        day_ago = timezone.now() - timedelta(hours=24)
        recent_submissions = Expense.objects.filter(
            submitted_at__gte=day_ago
        ).select_related('user', 'user__manager', 'category')
        
        # Format notifications
        notifications = []
        
        # Add pending approvals
        for expense in pending_expenses:
            manager = expense.user.manager
            notifications.append({
                'id': f'expense_{expense.id}',
                'type': 'approval_pending',
                'title': f'Expense Approval Required',
                'message': f'{expense.user.get_full_name() or expense.user.username} - {expense.category.name} - ₹{expense.amount:,.2f}',
                'timestamp': expense.submitted_at.isoformat(),
                'link': f'/admin/approvals',
                'expense_id': expense.id,
                'user': expense.user.username,
                'amount': float(expense.amount),
                'manager': {
                    'username': manager.username if manager else None,
                    'name': manager.get_full_name() if manager and manager.get_full_name() else (manager.username if manager else 'Not assigned'),
                    'email': manager.email if manager else None,
                    'department': manager.department if manager else None,
                }
            })
        
        # Add budget alerts
        for alert in recent_alerts:
            notifications.append({
                'id': f'alert_{alert.id}',
                'type': alert.notification_type,
                'title': alert.subject,
                'message': alert.message,
                'timestamp': alert.created_at.isoformat(),
                'link': None,
                'user': alert.user.username if alert.user else None
            })
        
        # Add recent submissions info (as a summary)
        if recent_submissions.exists():
            total_recent = recent_submissions.count()
            total_amount = recent_submissions.aggregate(total=Sum('amount'))['total'] or 0
            manager_names = []
            for submission in recent_submissions:
                manager = submission.user.manager
                if manager:
                    manager_names.append(manager.get_full_name() or manager.username)

            unique_manager_names = sorted(set(manager_names))
            notifications.append({
                'id': 'recent_submissions',
                'type': 'expense_submitted',
                'title': 'New Expense Submissions',
                'message': f'{total_recent} expense(s) submitted in last 24h - Total: ₹{total_amount:,.2f}',
                'timestamp': timezone.now().isoformat(),
                'link': '/admin/approvals',
                'count': total_recent,
                'amount': float(total_amount),
                'manager': {
                    'name': ', '.join(unique_manager_names[:3]) if unique_manager_names else 'Not assigned',
                    'email': None,
                    'department': None,
                }
            })
        
        # Sort by timestamp (newest first)
        notifications.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return Response({
            'count': len(notifications),
            'pending_approvals': pending_expenses.count(),
            'recent_alerts': recent_alerts.count(),
            'notifications': notifications[:20]  # Limit to 20 most recent
        })


class ExpenseDraftViewSet(viewsets.ModelViewSet):
    """Expense drafts - Users can save and manage drafts"""
    queryset = ExpenseDraft.objects.all()
    serializer_class = ExpenseDraftSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Users see only their own drafts"""
        return ExpenseDraft.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Auto-assign current user when creating draft"""
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def convert_to_expense(self, request, pk=None):
        """Convert a draft into a submitted expense"""
        draft = self.get_object()
        
        # Validate required fields
        if not all([draft.merchant, draft.amount, draft.expense_date, draft.category, draft.description]):
            return Response(
                {'detail': 'Draft is missing required fields. Please complete: merchant, amount, date, category, and description.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create expense from draft
        expense = Expense.objects.create(
            user=request.user,
            category=draft.category,
            merchant=draft.merchant,
            amount=draft.amount,
            expense_date=draft.expense_date,
            payment_method=draft.payment_method or 'credit_card',
            description=draft.description,
            status='pending'
        )
        
        # Delete draft after conversion
        draft.delete()
        
        return Response(
            ExpenseSerializer(expense).data,
            status=status.HTTP_201_CREATED
        )


class AdminSettingViewSet(viewsets.ViewSet):
    """Admin global settings endpoint."""
    permission_classes = [IsAuthenticated]

    def _is_admin(self, user):
        return user.is_staff or user.role == 'admin'

    def list(self, request):
        if not self._is_admin(request.user):
            return Response({'detail': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
        serializer = AdminSettingSerializer(AdminSetting.get_settings())
        return Response([serializer.data])

    @action(detail=False, methods=['get', 'patch'])
    def current(self, request):
        if not self._is_admin(request.user):
            return Response({'detail': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        settings_obj = AdminSetting.get_settings()
        if request.method == 'GET':
            return Response(AdminSettingSerializer(settings_obj).data)

        serializer = AdminSettingSerializer(settings_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def reset_defaults(self, request):
        if not self._is_admin(request.user):
            return Response({'detail': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        settings_obj = AdminSetting.get_settings()
        settings_obj.company_name = 'SmartSpend'
        settings_obj.default_currency = 'INR'
        settings_obj.budget_alert_threshold = 80
        settings_obj.email_notifications = True
        settings_obj.daily_digest = True
        settings_obj.notification_refresh_minutes = 2
        settings_obj.auto_approve_limit = Decimal('0.00')
        settings_obj.require_receipt_above = Decimal('0.00')
        settings_obj.save()

        return Response(AdminSettingSerializer(settings_obj).data)

    @action(detail=False, methods=['post'])
    def test_email(self, request):
        if not self._is_admin(request.user):
            return Response({'detail': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        recipient = request.data.get('recipient') or request.user.email
        if not recipient:
            return Response({'detail': 'Recipient email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        settings_obj = AdminSetting.get_settings()
        if not settings_obj.email_notifications:
            return Response({'detail': 'Email notifications are disabled in settings.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            send_mail(
                subject='SmartSpend Settings Test Email',
                message='This is a test email from SmartSpend Admin Settings.',
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@smartspend.local'),
                recipient_list=[recipient],
                fail_silently=False,
            )
            return Response({'detail': f'Test email sent to {recipient}.'})
        except Exception as exc:
            return Response({'detail': f'Failed to send test email: {exc}'}, status=status.HTTP_400_BAD_REQUEST)
