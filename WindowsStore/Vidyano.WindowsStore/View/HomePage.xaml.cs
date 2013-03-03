using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Vidyano.Common;
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
        private IList<ProgramUnitItemGroup> _Groups;
        private IList<ProgramUnitItem> _Items;
        private bool _CanChangeViews;

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

        protected override async void OnNavigatedTo(NavigationEventArgs e)
        {
            base.OnNavigatedTo(e);

            if (Service.Current.IsConnected)
            {
                DataContext = this;
                await Initialize(e.NavigationMode == NavigationMode.Back);
            }
        }

        private async Task Initialize(bool refreshProgramUnits)
        {
            var programUnitsData = Service.Current.Application["ProgramUnits"].ValueDirect;
            if (refreshProgramUnits)
            {
                var po = await Service.Current.ExecuteActionAsync("PersistentObject.viRefreshProgramUnits", Service.Current.Application);
                if (po != null && !po.HasNotification)
                    programUnitsData = po["ProgramUnits"].ValueDirect;
            }

            var jPos = JObject.Parse(programUnitsData);
            var units = jPos["units"];

            var items = units.SelectMany(pu => (JArray)pu["items"]).Select(pui => ProgramUnitItem.Create((JObject)pui)).ToList();
            var serviceItems = items.ToArray();

            await Client.CurrentClient.Hooks.OnLoadProgramUnitItems(items);

            var groups = new List<ProgramUnitItemGroup>();

            items.GroupBy(i => i.GroupId).Run(g =>
            {
                var groupItems = g.ToArray();

                if (groups.Count == 0 && !string.IsNullOrEmpty(Settings.Current.ProgramUnitItemImage))
                    groupItems = EnumerableEx.Return(new ProgramUnitItemImage(Settings.Current.ProgramUnitItemImage)).Concat(groupItems).ToArray();

                if ((bool)jPos["hasManagement"] && serviceItems.Intersect(g).Any())
                    groupItems = groupItems.Concat(EnumerableEx.Return(new ProgramUnitItemAddQuery((string)units.First()["id"], g.Key))).ToArray();

                groups.Add(new ProgramUnitItemGroup(groupItems));
            });

            if (groups.Count == 0)
            {
                var groupItems = new List<ProgramUnitItem>();

                if (!string.IsNullOrEmpty(Settings.Current.ProgramUnitItemImage))
                    groupItems.Add(new ProgramUnitItemImage(Settings.Current.ProgramUnitItemImage));

                if ((bool)jPos["hasManagement"])
                    groupItems.Add(new ProgramUnitItemAddQuery((string)units.First()["id"], null));

                groups.Add(new ProgramUnitItemGroup(groupItems.ToArray()));
            }

            Groups = new ReadOnlyCollection<ProgramUnitItemGroup>(groups);
            Items = new ReadOnlyCollection<ProgramUnitItem>(items);

            CanChangeViews = Groups.Count > 1;
        }

        #region Event Handlers

        private void ProgramUnitItemClick(object sender, ItemClickEventArgs e)
        {
            var item = e.ClickedItem as ProgramUnitItem;
            if (item != null)
                item.Open();
        }

        #endregion

        #region Properties

        public IList<ProgramUnitItemGroup> Groups { get { return _Groups; } set { SetProperty(ref _Groups, value); } }

        public IList<ProgramUnitItem> Items { get { return _Items; } set { SetProperty(ref _Items, value); } }

        public bool CanChangeViews { get { return _CanChangeViews; } set { SetProperty(ref _CanChangeViews, value); } }

        #endregion
    }
}