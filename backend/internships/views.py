from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import InternshipApplication


@api_view(['POST'])
def register_internship(request):
    try:
        data = request.data

        internship = InternshipApplication.objects.create(
            timestamp=data.get("timestamp"),
            email_address=data.get("email_address"),
            score=data.get("score"),
            full_name=data.get("full_name"),
            whatsapp_number=data.get("whatsapp_number"),
            personal_mail_id=data.get("personal_mail_id"),
            gender=data.get("gender"),
            date_of_birth=data.get("date_of_birth"),
            differently_abled=data.get("differently_abled"),
            current_status=data.get("current_status"),
            institution_name=data.get("institution_name"),
            degree=data.get("degree"),
            department=data.get("department"),
            year_of_study=data.get("year_of_study"),
            school_name=data.get("school_name"),
            school_class=data.get("school_class"),
            board=data.get("board"),
            selected_cluster=data.get("selected_cluster"),
            selected_domain=data.get("selected_domain"),
            selected_domain_id=data.get("selected_domain_id"),
            package_type=data.get("package_type"),
            referral_code=data.get("referral_code"),
            note=data.get("note"),
            intern_id=data.get("intern_id"),
            internship_duration=data.get("internship_duration"),
            internship_start_date=data.get("internship_start_date"),
            internship_end_date=data.get("internship_end_date"),
            application_status="Registered",
            processed=True,
        )

        return Response(
            {
                "success": True,
                "message": "Internship registered successfully",
                "id": internship.id,
            },
            status=status.HTTP_201_CREATED,
        )

    except Exception as e:
        return Response(
            {
                "success": False,
                "error": str(e),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
