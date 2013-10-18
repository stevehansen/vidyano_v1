using System;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Input;
using Windows.ApplicationModel.Search;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Vidyano.Commands;
using Vidyano.View;

namespace Vidyano.ViewModel.Pages
{
    public class QueryItemSelectPage : VidyanoPage, ICommand, ISearchPage
    {
        private ListViewSelectionMode _ListViewSelectionMode;
        private SelectMode mode = SelectMode.ReferenceAttribute;
        private string previousState;
        private Query query;
        private PersistentObjectAttributeWithReference referenceAttribute;
        private string targetProgramUnit, targetProgramUnitGroup;
        private DataTemplate _QueryItemTemplate;

        internal QueryItemSelectPage(LayoutAwarePage page)
            : base(page)
        {
            CancelCommand = new SimpleActionCommand(e => page.Frame.SetNavigationState(previousState));
            Template = (DataTemplate)Application.Current.Resources["QueryItemSelectPage"];
        }

        protected override void OnApplicationViewStateChanged()
        {
            if (Lookup == null)
                return;

            object template;

            // QueryItemTemplate
            if (!Application.Current.Resources.TryGetValue("QueryItemTemplate." + Lookup.PersistentObject.Type, out template))
                template = Application.Current.Resources["QueryItemTemplate.Default"];

            if (template == null || template != QueryItemTemplate)
                QueryItemTemplate = (DataTemplate)template ?? EmptyTemplate;
        }

        public StoreQuery Lookup { get; private set; }

        public ICommand CancelCommand { get; private set; }

        public ICommand SelectCommand { get; private set; }

        public ListViewSelectionMode ListViewSelectionMode
        {
            get { return _ListViewSelectionMode; }
            set { SetProperty(ref _ListViewSelectionMode, value); }
        }

        public DataTemplate QueryItemTemplate
        {
            get { return _QueryItemTemplate; }
            private set { SetProperty(ref _QueryItemTemplate, value); }
        }

        public bool CanExecute(object parameter)
        {
            return Lookup.SelectedItems.Count > 0;
        }

        public event EventHandler CanExecuteChanged = delegate { };

        public async void Execute(object parameter)
        {
            if (mode == SelectMode.ReferenceAttribute)
            {
                try
                {
                    await referenceAttribute.ChangeReference(Lookup.SelectedItems.First());
                }
                catch (Exception ex)
                {
                    referenceAttribute.Parent.SetNotification(ex.Message);
                }
            }
            else if (mode == SelectMode.Query)
            {
                try
                {
                    await Service.Current.ExecuteActionAsync("Query.AddReference", query.Parent, query, Lookup.SelectedItems.ToArray());
                    await query.RefreshQueryAsync();
                }
                catch (Exception ex)
                {
                    query.SetNotification(ex.Message);
                }
            }
            else if (mode == SelectMode.AddQueriesAsProgramUnits)
            {
                string err = null;
                try
                {
                    var parameters = new Dictionary<string, string>();
                    parameters["Id"] = targetProgramUnit;
                    parameters["GroupId"] = targetProgramUnitGroup;
                    var result = await Service.Current.ExecuteActionAsync("Query.AddQueriesToProgramUnit", null, Lookup, Lookup.SelectedItems.ToArray(), parameters);
                    if (result != null && !result.HasNotification)
                    {
                        var pObj = JObject.Parse(Service.Current.Application["ProgramUnits"].ValueDirect);
                        pObj["units"].First(pu => (string)pu["id"] == targetProgramUnit)["items"] = JArray.Parse(result["Items"].ValueDirect);
                        Service.Current.Application["ProgramUnits"].ValueDirect = pObj.ToString(Formatting.None);
                    }
                }
                catch (Exception ex)
                {
                    err = ex.Message;
                }

                if (err != null)
                    await Service.Current.Hooks.ShowNotification(err, NotificationType.Error);
            }

            Page.Frame.SetNavigationState(previousState);
        }

        public async Task Search(string text)
        {
            await Lookup.SearchTextAsync(text);
        }

        internal async Task Initialize(string arg)
        {
            if (Client.CurrentClient.HasSearch)
                SearchPane.GetForCurrentView().ShowOnKeyboardInput = true;

            var key = JObject.Parse(arg);

            previousState = (string)key["PreviousState"];
            var attrName = (string)key["Attribute"];
            if (!string.IsNullOrEmpty(attrName))
            {
                var parent = Client.CurrentClient.GetCachedObject<PersistentObject>((string)key["Parent"]);
                referenceAttribute = parent.GetAttribute(attrName) as PersistentObjectAttributeWithReference;
                if (referenceAttribute != null)
                    Lookup = (StoreQuery)referenceAttribute.Lookup;

                ListViewSelectionMode = ListViewSelectionMode.Single;
            }
            else if (!string.IsNullOrEmpty((string)key["Query"]))
            {
                query = Client.CurrentClient.GetCachedObject<Query>((string)key["Query"]);
                Lookup = (StoreQuery)Service.Current.Hooks.OnConstruct(query.Model, query.Parent, true);

                ListViewSelectionMode = ListViewSelectionMode.Multiple;
                mode = SelectMode.Query;
            }
            else
            {
                targetProgramUnit = (string)key["targetProgramUnit"];
                targetProgramUnitGroup = (string)key["targetProgramUnitGroup"];
                Lookup = Client.CurrentClient.GetCachedObject<StoreQuery>((string)key["AdministratorAddQueriesQuery"]);

                ListViewSelectionMode = ListViewSelectionMode.Multiple;
                mode = SelectMode.AddQueriesAsProgramUnits;
            }

            if (Lookup != null)
            {
                Lookup.SelectedItems.CollectionChanged += SelectedItems_CollectionChanged;
                await Lookup.SearchTextAsync(null);
            }

            OnApplicationViewStateChanged();
        }

        private void SelectedItems_CollectionChanged(object sender, NotifyCollectionChangedEventArgs e)
        {
            CanExecuteChanged(this, EventArgs.Empty);
        }

        private void SelectedItemsListView_ItemClick(object sender, ItemClickEventArgs e)
        {
            Lookup.SelectedItems.Remove(e.ClickedItem as QueryResultItem);
        }

        public override void Dispose()
        {
            if (Lookup != null)
                Lookup.SelectedItems.CollectionChanged -= SelectedItems_CollectionChanged;
        }

        private enum SelectMode
        {
            ReferenceAttribute,
            Query,
            AddQueriesAsProgramUnits
        }
    }
}