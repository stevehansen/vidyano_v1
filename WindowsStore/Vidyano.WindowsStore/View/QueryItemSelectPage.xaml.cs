using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Vidyano.ViewModel;
using Windows.ApplicationModel.Search;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

// The Blank Page item template is documented at http://go.microsoft.com/fwlink/?LinkId=234238

namespace Vidyano.View
{
    /// <summary>
    /// An empty page that can be used on its own or navigated to within a Frame.
    /// </summary>
    public sealed partial class QueryItemSelectPage
    {
        enum SelectMode
        {
            ReferenceAttribute,
            Query,
            AddQueriesAsProgramUnits
        }

        public static readonly DependencyProperty LookupProperty = DependencyProperty.Register("Lookup", typeof(Query), typeof(QueryItemSelectPage), new PropertyMetadata(null));

        private PersistentObjectAttributeWithReference referenceAttribute;
        private Query query;
        private SelectMode mode = SelectMode.ReferenceAttribute;
        private string targetProgramUnit;
        private string previousState;

        public QueryItemSelectPage()
        {
            this.InitializeComponent();
        }

        protected async override void OnNavigatedTo(NavigationEventArgs e)
        {
            DataContext = this;

            if(((Client)Client.Current).HasSearch)
                SearchPane.GetForCurrentView().ShowOnKeyboardInput = true;

            var key = JObject.Parse(e.Parameter as string);

            previousState = (string)key["PreviousState"];
            var attrName = (string)key["Attribute"];
            if (!string.IsNullOrEmpty(attrName))
            {
                var parent = Service.Current.GetCachedObject<PersistentObject>((string)key["Parent"]);
                referenceAttribute = parent.GetAttribute(attrName) as PersistentObjectAttributeWithReference;
                if (referenceAttribute != null)
                    Lookup = referenceAttribute.Lookup;

                queryGridView.SelectionMode = queryListView.SelectionMode = ListViewSelectionMode.Single;
            }
            else if (!string.IsNullOrEmpty((string)key["Query"]))
            {
                query = Service.Current.GetCachedObject<Query>((string)key["Query"]);
                Lookup = new Query(query.Model, query.Parent, true);

                queryGridView.SelectionMode = queryListView.SelectionMode = ListViewSelectionMode.Multiple;
                mode = SelectMode.Query;
            }
            else
            {
                targetProgramUnit = (string)key["targetProgramUnit"];
                Lookup = Service.Current.GetCachedObject<Query>((string)key["AdministratorAddQueriesQuery"]);

                queryGridView.SelectionMode = queryListView.SelectionMode = ListViewSelectionMode.Multiple;
                mode = SelectMode.AddQueriesAsProgramUnits;
            }

            if (Lookup != null)
            {
                Lookup.SelectedItems.CollectionChanged += SelectedItems_CollectionChanged;
                await Lookup.SearchTextAsync(null);
            }
        }

        protected override void OnNavigatingFrom(NavigatingCancelEventArgs e)
        {
            if (((Client)Client.Current).HasSearch)
                SearchPane.GetForCurrentView().ShowOnKeyboardInput = false;

            base.OnNavigatingFrom(e);
        }

        protected override void OnNavigatedFrom(NavigationEventArgs e)
        {
            if (Lookup != null)
                Lookup.SelectedItems.CollectionChanged -= SelectedItems_CollectionChanged;
        }

        private void SelectedItems_CollectionChanged(object sender, System.Collections.Specialized.NotifyCollectionChangedEventArgs e)
        {
            Select.IsEnabled = Lookup.SelectedItems.Count > 0;
        }

        public Query Lookup
        {
            get { return (Query)GetValue(LookupProperty); }
            set { SetValue(LookupProperty, value); }
        }

        private void SelectedItemsListView_ItemClick(object sender, ItemClickEventArgs e)
        {
            Lookup.SelectedItems.Remove(e.ClickedItem as QueryResultItem);
        }

        private void Cancel_Click(object sender, RoutedEventArgs e)
        {
            Frame.SetNavigationState(previousState);
        }

        private async void Select_Click(object sender, RoutedEventArgs e)
        {
            if (Select.IsEnabled)
            {
                if (mode == SelectMode.ReferenceAttribute)
                    try
                    {
                        await referenceAttribute.ChangeReference(Lookup.SelectedItems.First());
                    }
                    catch (Exception ex)
                    {
                        referenceAttribute.Parent.SetNotification(ex.Message);
                    }
                else if (mode == SelectMode.Query)
                {
                    try
                    {
                        await Service.Current.ExecuteActionAsync("Query.AddReference", query.Parent, query, Lookup.SelectedItems.ToArray());
                        await query.RefreshQueryAsync();
                    }
                    catch(Exception ex)
                    {
                        query.SetNotification(ex.Message);
                    }
                }
                else if(mode == SelectMode.AddQueriesAsProgramUnits)
                {
                    try
                    {
                        var parameters = new Dictionary<string, string>();
                        parameters["Id"] = targetProgramUnit;
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
                        ((Client)Client.Current).Hooks.ShowNotification(ex.Message, NotificationType.Error);
                    }
                }

                Frame.SetNavigationState(previousState);
            }
        }
    }
}