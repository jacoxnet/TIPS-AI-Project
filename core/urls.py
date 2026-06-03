from django.urls import path
from . import views

urlpatterns = [
    path('', views.init_view, name='init'),
    path('home/', views.home_view, name='home'),
    # path('data-entry/', views.data_entry_view, name='data_entry'),
    path('specs/', views.specs_view, name='specs'),
    path('make_ladder/', views.make_ladder_view, name='make_ladder'),
    path('ladder_display/', views.ladder_display_view, name='ladder_display'),
    path('clear_ladder/', views.clear_ladder_view, name='clear_ladder'),
    path('sample_csv/', views.sample_csv_view, name='sample_csv'),
]
