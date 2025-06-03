from rest_framework import serializers

class ContributeInstagramIDSerializer(serializers.Serializer):
    instagram_id = serializers.CharField(max_length=255)
