using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Vidyano.View.Common;
using Vidyano.ViewModel;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.Security.Credentials;
using Windows.UI.Popups;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

namespace Vidyano.View
{
    sealed partial class HomePage
    {
        #region Fields

        public static readonly DependencyProperty ProgramUnitItemsProperty = DependencyProperty.Register("ProgramUnitItems", typeof(ObservableCollection<ProgramUnitItem>), typeof(HomePage), new PropertyMetadata(null));

        #endregion

        public HomePage()
        {
            InitializeComponent();
        }

        protected override void OnNavigatingFrom(NavigatingCancelEventArgs e)
        {
            if (e.NavigationMode == NavigationMode.Back && Service.Current.IsConnected && e.SourcePageType == typeof(SignInPage))
                e.Cancel = true;

            base.OnNavigatingFrom(e);
        }

        protected override void OnNavigatedTo(NavigationEventArgs e)
        {
            DataContext = this;

            if (Service.Current.IsConnected)
            {
                var jPos = JObject.Parse(Service.Current.Application["ProgramUnits"].ValueDirect);
                var units = jPos["units"];
                ProgramUnitItems = new ObservableCollection<ProgramUnitItem>(units.SelectMany(pu => (JArray)pu["items"]).Select(pui =>
                {
                    return new ProgramUnitItem((JObject)pui);
                }));

                if ((bool)jPos["hasManagement"])
                {
                    ProgramUnitItems.Add(new ProgramUnitItem(new JObject(
                        new JProperty("name", "AdministratorAddQueriesProgramUnit"),
                        new JProperty("targetProgramUnit", units.First()["id"])
                        )));
                }
            }

            base.OnNavigatedTo(e);
        }

        #region Properties

        public ObservableCollection<ProgramUnitItem> ProgramUnitItems
        {
            get { return (ObservableCollection<ProgramUnitItem>)GetValue(ProgramUnitItemsProperty); }
            set { SetValue(ProgramUnitItemsProperty, value); }
        }

        #endregion

        #region Event Handlers

        private async void ProgramUnitItemClick(object sender, ItemClickEventArgs e)
        {
            var item = e.ClickedItem as ProgramUnitItem;
            if (item == null)
                return;

            try
            {
                if (item.Name != "AdministratorAddQueriesProgramUnit")
                {
                    var navigate = new Commands.Navigate();
                    if (!string.IsNullOrEmpty(item.PersistentObject))
                        await navigate.Execute(Service.Current.GetPersistentObjectAsync(item.PersistentObject, item.ObjectId));
                    else if (!string.IsNullOrEmpty(item.Query))
                        await navigate.Execute(Service.Current.GetQueryAsync(item.Query));
                }
                else
                {
                    var queryiesQuery = await Service.Current.GetQueryAsync("5a4ed5c7-b843-4a1b-88f7-14bd1747458b");
                    var frame = Windows.UI.Xaml.Window.Current.Content as Frame;
                    if (frame != null)
                    {
                        frame.Navigate(typeof(QueryItemSelectPage), new JObject(
                                new JProperty("targetProgramUnit", item.Model["targetProgramUnit"]),
                                new JProperty("AdministratorAddQueriesQuery", Service.Current.AddCachedObject(queryiesQuery)),
                                new JProperty("PreviousState", frame.GetNavigationState())).ToString(Formatting.None));
                    }
                }
            }
            catch (Exception ex)
            {
                ((Client)Client.Current).Hooks.ShowNotification(ex.Message, NotificationType.Error);
            }
        }

        #endregion
    }
}