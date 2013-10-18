using System;

namespace Vidyano.ViewModel
{
    public class NotificationChangedEventArgs : EventArgs
    {
        internal NotificationChangedEventArgs(string notification, NotificationType notificationType)
        {
            Notification = notification;
            NotificationType = notificationType;
        }

        public string Notification { get; private set; }

        public NotificationType NotificationType { get; private set; }
    }
}