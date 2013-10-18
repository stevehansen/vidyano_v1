using System.Windows.Automation.Peers;
using System.Windows.Automation.Provider;
using System.Windows.Controls;
using Microsoft.Phone.Controls;

namespace Vidyano.View.Controls
{
    class PersistentObjectAttributeTimePicker : TimePicker
    {
        public void Open()
        {
            var btn = GetTemplateChild("DateTimeButton") as Button;
            var peer = new ButtonAutomationPeer(btn);
            var provider = peer.GetPattern(PatternInterface.Invoke) as IInvokeProvider;
            if (provider != null)
                provider.Invoke();
        }
    }
}