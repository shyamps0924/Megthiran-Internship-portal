from django.urls import path

from .views import register_internship

urlpatterns = [
    path(
        'register/',
        register_internship,
        name='register_internship',
    ),
]
