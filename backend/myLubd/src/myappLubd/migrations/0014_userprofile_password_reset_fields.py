from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('myappLubd', '0013_preventivemaintenance_job'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='reset_password_token',
            field=models.CharField(blank=True, max_length=128, null=True),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='reset_password_expires_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='reset_password_used',
            field=models.BooleanField(default=False),
        ),
    ]