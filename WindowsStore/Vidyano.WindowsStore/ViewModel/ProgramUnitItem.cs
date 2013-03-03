using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Vidyano.ViewModel
{
    public abstract class ProgramUnitItem : ViewModelBase
    {
        internal ProgramUnitItem(JObject model) :
            base(model)
        {
            var jGroup = model["group"];
            if (jGroup != null)
            {
                GroupId = (string)jGroup["id"];
                GroupTitle = (string)jGroup["title"];
            }
        }

        protected ProgramUnitItem(string title, string name, string groupId, string groupTitle):
            this(new JObject(new JProperty("title", title), new JProperty("name", name),
                 new JProperty("group", new JObject(new JProperty("id", groupId), new JProperty("title", groupTitle)))))
        {   
        }

        public string Title { get { return GetProperty<string>(); } }

        internal string Name { get { return GetProperty<string>(); } }

        public string GroupId { get; private set; }

        public string GroupTitle { get; private set; }

        public virtual int RowSpan { get { return 1; } }

        public virtual int ColumnSpan { get { return 1; } }

        internal static ProgramUnitItem Create(JObject model)
        {
            if (model["query"] != null)
                return new ProgramUnitItemQuery(model);
            else if (model["persistentObject"] != null)
                return new ProgramUnitItemPersistentObject(model);

            return null;
        }

        protected internal virtual void Open() { }

        protected internal abstract string Template { get; }
    }

    public class ProgramUnitItemQuery : ProgramUnitItem
    {
        internal ProgramUnitItemQuery(JObject model) :
            base(model)
        {
        }

        public string QueryName { get { return GetProperty<string>(); } }

        public string Query { get { return GetProperty<string>(); } }

        public string Count { get { return GetProperty<string>(); } }

        protected internal override string Template
        {
            get { return "ProgramUnitItemTemplate.Query"; }
        }

        protected internal async override void Open()
        {
            try
            {
                await new Commands.Navigate().Execute(Service.Current.GetQueryAsync(Query));
            }
            catch (Exception ex)
            {
                ((Client)Client.Current).Hooks.ShowNotification(ex.Message, NotificationType.Error);
            }
        }
    }

    public class ProgramUnitItemPersistentObject : ProgramUnitItem
    {
        internal ProgramUnitItemPersistentObject(JObject model) :
            base(model)
        {
        }

        public string PersistentObject { get { return GetProperty<string>(); } }

        public string PersistentObjectType { get { return GetProperty<string>(); } }

        public string ObjectId { get { return GetProperty<string>(); } }

        protected internal override string Template
        {
            get { return "ProgramUnitItemTemplate.PersistentObject"; }
        }

        protected internal override async void Open()
        {
            try
            {
                await new Commands.Navigate().Execute(Service.Current.GetPersistentObjectAsync(PersistentObject, ObjectId));
            }
            catch (Exception ex)
            {
                ((Client)Client.Current).Hooks.ShowNotification(ex.Message, NotificationType.Error);
            }
        }
    }

    public class ProgramUnitItemAddQuery : ProgramUnitItem
    {
        private readonly string targetProgramUnitId, targetProgramUnitGroupId;

        internal ProgramUnitItemAddQuery(string targetProgramUnitId, string targetProgramUnitGroupId) :
            base(new JObject())
        {
            this.targetProgramUnitId = targetProgramUnitId;
            this.targetProgramUnitGroupId = targetProgramUnitGroupId;
        }

        protected internal override string Template
        {
            get { return "ProgramUnitItemTemplate.AddQuery"; }
        }

        protected internal override async void Open()
        {
            var queryiesQuery = await Service.Current.GetQueryAsync("5a4ed5c7-b843-4a1b-88f7-14bd1747458b");
            var frame = Windows.UI.Xaml.Window.Current.Content as Windows.UI.Xaml.Controls.Frame;
            if (frame != null)
            {
                frame.Navigate(typeof(Vidyano.View.QueryItemSelectPage), new JObject(
                        new JProperty("targetProgramUnit", targetProgramUnitId),
                        new JProperty("targetProgramUnitGroup", targetProgramUnitGroupId),
                        new JProperty("AdministratorAddQueriesQuery", Service.Current.AddCachedObject(queryiesQuery)),
                        new JProperty("PreviousState", frame.GetNavigationState())).ToString(Newtonsoft.Json.Formatting.None));
            }
        }
    }

    public class ProgramUnitItemImage : ProgramUnitItem
    {
        internal ProgramUnitItemImage(string source) :
            base(new JObject())
        {
            Source = source;
        }

        public string Source { get; private set; }

        public override int RowSpan { get { return 10; } }

        public override int ColumnSpan { get { return 2; } }

        protected internal override string Template
        {
            get { return "ProgramUnitItemTemplate.Image"; }
        }
    }
}