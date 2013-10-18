using System.Threading.Tasks;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Vidyano.View.Pages;

namespace Vidyano.ViewModel.Actions
{
    class AddReference : QueryAction
    {
        public AddReference(Definition definition, PersistentObject parent, Query query)
            : base(definition, parent, query)
        {
        }

        public override async Task Execute(object option)
        {
            await Task.Delay(0);

            var frame = Window.Current.Content as Frame;
            if (frame != null)
            {
                frame.Navigate(typeof(QueryItemSelectPage), new JObject(
                    new JProperty("Query", Query.PagePath),
                    new JProperty("PreviousState", frame.GetNavigationState())).ToString(Formatting.None));
            }
        }
    }
}