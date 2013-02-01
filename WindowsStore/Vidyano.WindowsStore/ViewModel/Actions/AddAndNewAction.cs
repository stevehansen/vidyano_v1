using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Vidyano.ViewModel.Actions
{
    class AddAndNewAction: QueryAction
    {
        private New newAction;
        private AddReference addAction;

        public AddAndNewAction(New newAction, AddReference addAction) :
            base(addAction.definition, addAction.Parent, addAction.Query)
        {
            this.newAction = newAction;
            this.addAction = addAction;

            newAction.IsVisible = false;
            addAction.IsVisible = false;

            CanExecute = IsVisible = true;

            var options = new List<string>();
            if (newAction.Options != null && newAction.Options.Length > 0)
                options.AddRange(newAction.Options.Select(o => newAction.DisplayName + " " + o));
            else
                options.Add(newAction.DisplayName);
            
            options.Add(Service.Current.Messages["Existing"]);
            Options = options.ToArray();
        }

        public override async Task Execute(object option)
        {
            var idx = Array.IndexOf(Options, (string)option);

            if (idx == Options.Length - 1)
                await addAction.Execute(-1);
            else
                await newAction.Execute(idx);
        }
    }
}