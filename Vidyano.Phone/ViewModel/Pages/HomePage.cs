using Microsoft.Phone.Controls;
using Microsoft.Phone.Shell;
using Newtonsoft.Json.Linq;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using Vidyano.Common;

namespace Vidyano.ViewModel.Pages
{
    public class HomePage : VidyanoPage
    {
        #region Private Fields

        private readonly PhoneApplicationPage page;

        #endregion

        #region Private Property Backers

        private IList<ProgramUnitItemGroup> _Groups;
        private IList<ProgramUnitItem> _Items;

        #endregion

        internal HomePage(PhoneApplicationPage page)
            : base(page)
        {
            this.page = page;
        }

        internal async Task Initialize(bool refreshProgramUnits)
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

            await Service.Current.Hooks.OnLoadProgramUnitItems(items);

            var groups = new List<ProgramUnitItemGroup>();

            items.GroupBy(i => i.GroupId).Run(g => groups.Add(new ProgramUnitItemGroup(g.ToArray())));

            if (groups.Count == 0)
                groups.Add(new ProgramUnitItemGroup(new ProgramUnitItem[0]));

            var empty = groups.FirstOrDefault(g => string.IsNullOrEmpty(g.Title));
            if (empty != null)
                empty.Title = Service.Current.Messages[Settings.Current.DefaultProgramUnitItemGroupNameKey];

            Groups = new ReadOnlyCollection<ProgramUnitItemGroup>(groups);
            Items = new ReadOnlyCollection<ProgramUnitItem>(items);

            var buttons = new List<ApplicationBarIconButton>();
            var menuItems = new List<ApplicationBarMenuItem>();

            ((PhoneHooks)Service.Current.Hooks).OnCreateHomePageApplicationBar(buttons, menuItems);

            if (buttons.Count > 0 || menuItems.Count > 0)
            {
                var appBar = new ApplicationBar();
                buttons.Run(btn => appBar.Buttons.Add(btn));
                menuItems.Run(menuItem => appBar.MenuItems.Add(menuItem));

                appBar.Mode = buttons.Count > 0 ? ApplicationBarMode.Default : ApplicationBarMode.Minimized;

                page.ApplicationBar = appBar;
            }
        }

        protected override async void OnSearch(string searchText)
        {
            if (!string.IsNullOrEmpty(searchText))
                await new Commands.Navigate().Execute(Service.Current.GetPersistentObjectAsync(Service.Current.Application["GlobalSearchId"].DisplayValue, searchText));
        }

        #region Properties

        public IList<ProgramUnitItemGroup> Groups
        {
            get { return _Groups; }
            set { SetProperty(ref _Groups, value); }
        }

        public IList<ProgramUnitItem> Items
        {
            get { return _Items; }
            set { SetProperty(ref _Items, value); }
        }

        public DataTemplate LayoutTemplate
        {
            get { return (DataTemplate)Application.Current.Resources["HomePage." + Settings.Current.HomePageLayoutMode.ToString()]; }
        }

        #endregion
    }
}