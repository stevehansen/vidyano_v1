using Newtonsoft.Json.Linq;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using Vidyano.Common;
using Vidyano.View;
using Windows.ApplicationModel.Search;
using Windows.UI.ViewManagement;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace Vidyano.ViewModel.Pages
{
    public class HomePage : VidyanoPage
    {
        private bool _CanChangeViews;
        private IList<ProgramUnitItemGroup> _Groups;
        private IList<ProgramUnitItem> _Items;

        internal HomePage(LayoutAwarePage page)
            : base(page)
        {
            OnApplicationViewStateChanged();
        }

        internal async Task Initialize(bool refreshProgramUnits)
        {
            SearchPane.GetForCurrentView().ShowOnKeyboardInput = false;

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

            await Service.Current.Hooks.OnLoadProgramUnitItems(items);

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

        protected override void OnApplicationViewStateChanged()
        {
            Template = (DataTemplate)Application.Current.Resources[ViewState != ApplicationViewState.Snapped ? "HomePage" : "HomeSnappedPage"];
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

        public IList<ProgramUnitItemGroup> Groups
        {
            get { return _Groups; }
            private set { SetProperty(ref _Groups, value); }
        }

        public IList<ProgramUnitItem> Items
        {
            get { return _Items; }
            private set { SetProperty(ref _Items, value); }
        }

        public bool CanChangeViews
        {
            get { return _CanChangeViews; }
            private set { SetProperty(ref _CanChangeViews, value); }
        }

        #endregion
    }
}