using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Vidyano.View.Pages;

namespace Vidyano.ViewModel
{
    public class ProgramUnitItemAddQuery : ProgramUnitItem
    {
        private readonly string targetProgramUnitGroupId;
        private readonly string targetProgramUnitId;

        internal ProgramUnitItemAddQuery(string targetProgramUnitId, string targetProgramUnitGroupId)
            : base(new JObject())
        {
            this.targetProgramUnitId = targetProgramUnitId;
            this.targetProgramUnitGroupId = targetProgramUnitGroupId;
        }

        protected internal override string Template
        {
            get { return "ProgramUnitItemTemplate.AddQuery"; }
        }

        protected internal override bool IncludeInZoomedOutItemCount
        {
            get { return false; }
        }

        protected internal override async void Open()
        {
            var queryiesQuery = await Service.Current.GetQueryAsync("5a4ed5c7-b843-4a1b-88f7-14bd1747458b");
            var frame = Window.Current.Content as Frame;
            if (frame != null)
            {
                frame.Navigate(typeof(QueryItemSelectPage), new JObject(
                    new JProperty("targetProgramUnit", targetProgramUnitId),
                    new JProperty("targetProgramUnitGroup", targetProgramUnitGroupId),
                    new JProperty("AdministratorAddQueriesQuery", Client.CurrentClient.AddCachedObject(queryiesQuery)),
                    new JProperty("PreviousState", frame.GetNavigationState())).ToString(Formatting.None));
            }
        }
    }

    public class ProgramUnitItemImage : ProgramUnitItem
    {
        internal ProgramUnitItemImage(string source)
            : base(new JObject())
        {
            Source = source;
        }

        public string Source { get; private set; }

        public override int RowSpan
        {
            get { return 10; }
        }

        public override int ColumnSpan
        {
            get { return 2; }
        }

        protected internal override string Template
        {
            get { return "ProgramUnitItemTemplate.Image"; }
        }

        protected internal override bool IncludeInZoomedOutItemCount
        {
            get { return false; }
        }
    }
}