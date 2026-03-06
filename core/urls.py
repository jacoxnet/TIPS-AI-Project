from django.urls import path
from . import views

urlpatterns = [
    path('', views.home_view, name='home'),
    path('data-entry/', views.data_entry_view, name='data_entry'),
    path('ladder-display/', views.ladder_display_view, name='ladder_display'),
]
