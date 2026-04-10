from django.urls import path
from . import views

urlpatterns = [
    path('', views.init_view, name='init'),
    path('home/', views.home_view, name='home'),
    path('data-entry/', views.data_entry_view, name='data_entry'),
    path('ladder-display/', views.ladder_display_view, name='ladder_display'),
    path('clear-ladder/', views.clear_ladder_view, name='clear_ladder'),
]
