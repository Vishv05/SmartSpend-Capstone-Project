# Generated migration for Budget and NotificationLog models

from decimal import Decimal
from django.conf import settings
from django.db import migrations, models
import django.core.validators
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_ai_insights_models'),
    ]

    operations = [
        migrations.CreateModel(
            name='Budget',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('department', models.CharField(db_index=True, max_length=100)),
                ('period', models.CharField(choices=[('monthly', 'Monthly'), ('quarterly', 'Quarterly'), ('yearly', 'Yearly')], default='monthly', max_length=20)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(Decimal('0.01'))])),
                ('alert_threshold', models.IntegerField(default=80, help_text='Alert when spending reaches X% of budget')),
                ('start_date', models.DateField()),
                ('end_date', models.DateField()),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('category', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='budgets', to='api.category')),
            ],
            options={
                'db_table': 'budgets',
                'ordering': ['-start_date'],
            },
        ),
        migrations.CreateModel(
            name='NotificationLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('notification_type', models.CharField(choices=[('approval_pending', 'Approval Pending'), ('approval_approved', 'Approval Approved'), ('approval_rejected', 'Approval Rejected'), ('budget_alert', 'Budget Alert'), ('budget_exceeded', 'Budget Exceeded'), ('expense_submitted', 'Expense Submitted'), ('system', 'System Notification')], max_length=30)),
                ('subject', models.CharField(max_length=255)),
                ('message', models.TextField()),
                ('recipient_email', models.EmailField(max_length=254)),
                ('is_sent', models.BooleanField(default=False)),
                ('sent_at', models.DateTimeField(blank=True, null=True)),
                ('failed_reason', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expense', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='api.expense')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'notification_logs',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='budget',
            index=models.Index(fields=['department', 'start_date'], name='budgets_depa_departm_idx'),
        ),
        migrations.AddIndex(
            model_name='budget',
            index=models.Index(fields=['category', 'period'], name='budgets_categ_categor_idx'),
        ),
        migrations.AddIndex(
            model_name='notificationlog',
            index=models.Index(fields=['user', 'is_sent'], name='notificatio_user_id_sent_idx'),
        ),
        migrations.AddIndex(
            model_name='notificationlog',
            index=models.Index(fields=['notification_type', 'created_at'], name='notificatio_notific_created_idx'),
        ),
    ]
