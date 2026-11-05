from rest_framework import serializers
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class UserSerializer(serializers.ModelSerializer):
    rol = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'rol']

    def get_rol(self, obj):
        return "Administrador" if obj.is_staff or obj.is_superuser else "Vendedor"

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Genera los tokens JWT estándar (access y refresh)
        data = super().validate(attrs)
        
        # Agrega la información del usuario al payload de respuesta
        user_data = UserSerializer(self.user).data
        data.update(user_data)
        
        return data