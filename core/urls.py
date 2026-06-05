from django.urls import path
from . import views

urlpatterns = [
    path('', views.init_view, name='init'),
    path('home/', views.home_view, name='home'),
    path('specs/', views.specs_view, name='specs'),
    path('make_ladder/', views.make_ladder_view, name='make_ladder'),
    path('ladder_display/', views.ladder_display_view, name='ladder_display'),
    path('save_load/', views.save_load_view, name='save_load'),
    path('import_data', views.import_data_view, name='import_data'),
]
