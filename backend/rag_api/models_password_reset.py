from django.db import models
from rag_api.models import UserAccount

class PasswordResetToken(models.Model):
    user = models.ForeignKey(UserAccount, on_delete=models.CASCADE)
    token = models.CharField(max_length=128, unique=True)
    expiry = models.DateTimeField()
    used = models.BooleanField(default=False)

    def __str__(self):
        return f"PasswordResetToken(user={self.user_id}, token={self.token}, used={self.used})"
