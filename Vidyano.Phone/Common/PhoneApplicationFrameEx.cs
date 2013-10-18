using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Phone.Controls;

namespace Vidyano.Common
{
    static class PhoneApplicationFrameEx
    {
        private static readonly Stack<Uri> lastNavigationStateUris = new Stack<Uri>();

        public static string GetNavigationState(this PhoneApplicationFrame source)
        {
            var sb = new StringBuilder();
            source.BackStack.Where(bs => bs.Source.ToString().StartsWith("/Vidyano.Phone;")).Reverse().Run(bs => sb.AppendLine(bs.Source.ToString()));
            if (source.CurrentSource.ToString().StartsWith("/Vidyano.Phone;"))
                sb.AppendLine(source.CurrentSource.ToString());

            return sb.ToString();
        }

        public static void SetNavigationState(this PhoneApplicationFrame source, string state)
        {
            var entries = state.Split(new[] { "\r\n" }, StringSplitOptions.RemoveEmptyEntries);
            entries.Reverse().Run(e => lastNavigationStateUris.Push(new Uri(e, UriKind.Relative)));

            // First uri is always signin page, we randomize this to make sure we start from scratch
            if (lastNavigationStateUris.Count > 0)
                lastNavigationStateUris.Pop();

            source.Navigate(new Uri("/Vidyano.Phone;component/View/Pages/SignInPage.xaml?seed=" + Guid.NewGuid().ToString(), UriKind.Relative));
        }

        public static bool NavigatePendingStateRestore()
        {
            if (lastNavigationStateUris.Count > 0)
            {
                Client.RootFrame.Navigate(lastNavigationStateUris.Pop());
                return true;
            }

            return false;
        }
    }
}