from django.db import models


class InternshipApplication(models.Model):
    timestamp = models.DateTimeField(null=True, blank=True)
    email_address = models.CharField(max_length=255)
    score = models.CharField(max_length=50, null=True, blank=True)
    full_name = models.CharField(max_length=255)
    whatsapp_number = models.CharField(max_length=20)
    personal_mail_id = models.CharField(max_length=255)
    gender = models.CharField(max_length=50)
    date_of_birth = models.DateField(null=True, blank=True)
    differently_abled = models.CharField(max_length=50)
    current_status = models.CharField(max_length=100)
    institution_name = models.TextField()
    degree = models.CharField(max_length=100)
    department = models.CharField(max_length=100)
    year_of_study = models.CharField(max_length=50)
    school_name = models.TextField(null=True, blank=True)
    school_class = models.CharField(max_length=50, null=True, blank=True)
    board = models.CharField(max_length=100, null=True, blank=True)
    selected_cluster = models.CharField(max_length=100)
    selected_domain = models.CharField(max_length=255)
    selected_domain_id = models.CharField(max_length=50)
    package_type = models.CharField(max_length=100)
    referral_code = models.CharField(max_length=100, null=True, blank=True)
    note = models.TextField(null=True, blank=True)
    intern_id = models.CharField(max_length=20)
    internship_duration = models.IntegerField()
    internship_start_date = models.DateField()
    internship_end_date = models.DateField()
    application_status = models.CharField(
        max_length=100,
        default="Registered",
    )
    offer_letter_issued = models.BooleanField(default=False)
    lor_issued = models.BooleanField(default=False)
    completion_certificate_issued = models.BooleanField(default=False)
    processed = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.full_name
